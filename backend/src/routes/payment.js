const express = require('express');
const db = require('../db');
const zarinpal = require('../services/zarinpal');
const logger = require('../lib/logger');

const router = express.Router();

const FRONTEND_URL = process.env.FRONTEND_PUBLIC_URL || 'http://localhost:5173';
const PROCESSING_STALE_MS = 10 * 60 * 1000; // > gateway request timeout; stale claims are only a crash-recovery fallback

function redirectFor(orderId, status, extra = '') {
  const suffix = extra ? `&${extra}` : '';
  return `${FRONTEND_URL}/checkout/result?status=${encodeURIComponent(status)}&orderId=${encodeURIComponent(orderId)}${suffix}`;
}

function claimOrder(order) {
  const now = new Date().toISOString();
  const claim = db.prepare(
    `UPDATE orders
     SET status = 'processing_payment', payment_processing_started_at = ?
     WHERE id = ? AND status = 'pending_payment'`,
  ).run(now, order.id);
  if (claim.changes > 0) return true;

  const current = db.prepare(
    'SELECT status, payment_processing_started_at FROM orders WHERE id = ?',
  ).get(order.id);
  if (!current) return false;
  if (current.status !== 'processing_payment') return false;

  const startedAt = Date.parse(current.payment_processing_started_at || '');
  if (!Number.isFinite(startedAt) || Date.now() - startedAt < PROCESSING_STALE_MS) return false;

  const staleClaim = db.prepare(
    `UPDATE orders
     SET status = 'processing_payment', payment_processing_started_at = ?
     WHERE id = ? AND status = 'processing_payment' AND payment_processing_started_at = ?`,
  ).run(now, order.id, current.payment_processing_started_at);
  return staleClaim.changes > 0;
}

function releaseStockAndFinalize(orderId, finalStatus) {
  const tx = db.transaction(() => {
    const order = db.prepare('SELECT status FROM orders WHERE id = ?').get(orderId);
    if (!order || order.status !== 'processing_payment') return false;

    const items = db.prepare('SELECT composition FROM order_items WHERE order_id = ?').all(orderId);
    for (const item of items) {
      if (!item.composition) continue;
      const parts = JSON.parse(item.composition);
      for (const part of parts) {
        db.prepare('UPDATE products SET stock_grams = stock_grams + ? WHERE id = ?').run(part.grams, part.productId);
      }
    }

    db.prepare(
      `UPDATE orders
       SET status = ?, payment_processing_started_at = NULL
       WHERE id = ? AND status = 'processing_payment'`,
    ).run(finalStatus, orderId);
    return true;
  });
  return tx();
}

// GET /api/payment/callback?Authority=...&Status=OK|NOK
// Zarinpal redirects the customer's browser here after payment.
router.get('/callback', async (req, res) => {
  const authority = String(req.query.Authority || '').trim();
  const status = String(req.query.Status || '').trim().toUpperCase();
  if (!authority || authority.length > 256) {
    return res.redirect(`${FRONTEND_URL}/checkout/result?status=error&reason=invalid_callback`);
  }

  const order = db.prepare('SELECT * FROM orders WHERE zarinpal_authority = ?').get(authority);
  if (!order) {
    return res.redirect(`${FRONTEND_URL}/checkout/result?status=error&reason=order_not_found`);
  }

  if (!claimOrder(order)) {
    const current = db.prepare('SELECT status FROM orders WHERE id = ?').get(order.id);
    const statusMap = { paid: 'success', failed: 'failed', canceled: 'canceled', processing_payment: 'processing' };
    const mapped = statusMap[current?.status] || 'error';
    return res.redirect(redirectFor(order.id, mapped));
  }

  if (status !== 'OK') {
    releaseStockAndFinalize(order.id, 'canceled');
    return res.redirect(redirectFor(order.id, 'canceled'));
  }

  try {
    const result = await zarinpal.verifyPayment({ amountToman: order.total_amount, authority });
    if (result.ok) {
      const updated = db.prepare(
        `UPDATE orders
         SET status = 'paid', zarinpal_ref_id = ?, paid_at = datetime('now'), payment_processing_started_at = NULL
         WHERE id = ? AND status = 'processing_payment'`,
      ).run(result.refId, order.id);
      if (updated.changes !== 1) {
        logger.error('payment finalization lost order claim', null, { orderId: order.id });
        return res.redirect(redirectFor(order.id, 'error'));
      }
      return res.redirect(redirectFor(order.id, 'success'));
    }

    releaseStockAndFinalize(order.id, 'failed');
    return res.redirect(redirectFor(order.id, 'failed'));
  } catch (err) {
    // Verification can fail transiently after the gateway has accepted the
    // payment. Do NOT release stock here. Return the order to pending_payment
    // so a later callback can retry verification safely; stale processing
    // claims are also reclaimable after PROCESSING_STALE_MS.
    logger.error('zarinpal.verifyPayment failed', err, { orderId: order.id });
    db.prepare(
      `UPDATE orders
       SET status = 'pending_payment', payment_processing_started_at = NULL
       WHERE id = ? AND status = 'processing_payment'`,
    ).run(order.id);
    return res.redirect(redirectFor(order.id, 'error'));
  }
});

module.exports = router;
