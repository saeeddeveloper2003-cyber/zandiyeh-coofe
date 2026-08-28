/**
 * Safety-net job for orders that got stuck waiting on Zarinpal.
 *
 * Normally payment.js's /api/payment/callback route finalizes an order the
 * moment Zarinpal redirects the customer back. But if the server crashes (or
 * the customer never gets redirected back at all) between "payment
 * requested" and "callback handled", an order can sit in pending_payment or
 * processing_payment forever even though the customer *did* pay. This job
 * re-asks Zarinpal about any old, still-unresolved order and reconciles it.
 *
 * Run via `npm run reconcile:payments` (intended to be scheduled, e.g. cron
 * every few minutes).
 */
require('dotenv').config();
const db = require('../db');
const zarinpal = require('../services/zarinpal');
const logger = require('../lib/logger');

const AGE_MINUTES = Math.max(1, Number(process.env.PAYMENT_RECONCILE_AGE_MINUTES || 15));
const LIMIT = Math.min(200, Math.max(1, Number(process.env.PAYMENT_RECONCILE_LIMIT || 50)));
const DRY_RUN = process.env.PAYMENT_RECONCILE_DRY_RUN === 'true';

// Mirrors payment.js's finalize-as-paid write: guarded so it only ever moves
// an order OUT of pending_payment/processing_payment, never overwrites a
// status a concurrent real callback may have already set (e.g. 'failed').
function markPaid(orderId, refId) {
  const result = db.prepare(`
    UPDATE orders
    SET status = 'paid',
        zarinpal_ref_id = COALESCE(zarinpal_ref_id, ?),
        paid_at = COALESCE(paid_at, datetime('now')),
        payment_processing_started_at = NULL
    WHERE id = ? AND status IN ('pending_payment', 'processing_payment')
  `).run(refId, orderId);
  return result.changes === 1;
}

async function main() {
  const rows = db.prepare(`
    SELECT id, zarinpal_authority, total_amount
    FROM orders
    WHERE zarinpal_authority IS NOT NULL
      AND status IN ('pending_payment', 'processing_payment')
      AND created_at < datetime('now', ?)
    ORDER BY created_at ASC
    LIMIT ?
  `).all(`-${AGE_MINUTES} minutes`, LIMIT);

  logger.info('payment reconciliation started', { count: rows.length, ageMinutes: AGE_MINUTES, dryRun: DRY_RUN });

  for (const order of rows) {
    try {
      const result = await zarinpal.verifyPayment({ amountToman: order.total_amount, authority: order.zarinpal_authority });

      if (DRY_RUN) {
        logger.info('payment reconciliation result (dry run)', { orderId: order.id, ok: result.ok });
        continue;
      }

      if (result.ok) {
        const updated = markPaid(order.id, result.refId);
        logger.info('payment reconciled as paid', { orderId: order.id, updated });
      } else {
        // Don't auto-cancel/release stock here — a "not verified" response
        // can also mean the payment is still in flight at the gateway.
        // Leave it for a later run (or manual review) rather than risk
        // releasing stock for a purchase that actually succeeds a moment
        // later.
        logger.warn('payment still unresolved after reconciliation attempt', { orderId: order.id, message: result.message });
      }
    } catch (err) {
      logger.warn('payment reconciliation attempt failed', { orderId: order.id, error: err.message });
    }
  }

  logger.info('payment reconciliation finished');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    logger.error('payment reconciliation crashed', err);
    process.exit(1);
  });
