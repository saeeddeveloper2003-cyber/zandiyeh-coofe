import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const verifyPaymentMock = vi.fn();
vi.mock('../services/zarinpal.js', () => ({
  requestPayment: vi.fn(),
  verifyPayment: (...args) => verifyPaymentMock(...args),
}));

let db;
let dbPath;
let app;

async function freshApp() {
  vi.resetModules();
  dbPath = path.join(os.tmpdir(), `zandieh-payment-test-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
  process.env.DB_PATH = dbPath;
  process.env.FRONTEND_PUBLIC_URL = 'http://localhost:5173';
  const dbModulePath = require.resolve('../db.js');
  delete require.cache[dbModulePath];
  db = require('../db.js');
  const { default: paymentRouter } = await import('./payment.js');
  app = express();
  app.use('/api/payment', paymentRouter);
}

function createOrder({ status = 'pending_payment', authority = 'AUTH-1', stockReserved = 100 } = {}) {
  const orderId = `order-${Math.random().toString(36).slice(2, 9)}`;
  db.prepare(`
    INSERT INTO orders (id, customer_name, customer_phone, customer_address, total_amount, status, zarinpal_authority)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(orderId, 'مریم رضایی', '09121234567', 'تهران، خیابان آزادی، پلاک ۱۲', 373000, status, authority);
  db.prepare(`
    INSERT INTO order_items (order_id, kind, name, weight_label, meta, grams_total, unit_price, qty, composition)
    VALUES (?, 'product', 'چری', '۲۵۰ گرم', NULL, ?, 373000, 1, ?)
  `).run(orderId, stockReserved, JSON.stringify([{ productId: 'p1', pct: 100, grams: stockReserved }]));
  db.prepare('UPDATE products SET stock_grams = stock_grams - ? WHERE id = ?').run(stockReserved, 'p1');
  return orderId;
}

beforeEach(async () => {
  verifyPaymentMock.mockReset();
  await freshApp();
});

afterEach(() => {
  if (db && db.open) db.close();
  for (const suffix of ['', '-wal', '-shm']) {
    try { fs.unlinkSync(dbPath + suffix); } catch { /* ignore */ }
  }
});

describe('GET /api/payment/callback', () => {
  it('redirects with error when the authority does not map to an order', async () => {
    const res = await request(app).get('/api/payment/callback?Authority=UNKNOWN&Status=OK');
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('/checkout/result?status=error&reason=order_not_found');
  });

  it('cancels the order and releases stock when the gateway returns NOK', async () => {
    const before = db.prepare('SELECT stock_grams FROM products WHERE id = ?').get('p1').stock_grams + 100;
    const orderId = createOrder({ authority: 'AUTH-CANCEL', stockReserved: 100 });

    const res = await request(app).get('/api/payment/callback?Authority=AUTH-CANCEL&Status=NOK');
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain(`status=canceled&orderId=${orderId}`);
    expect(db.prepare('SELECT status FROM orders WHERE id = ?').get(orderId).status).toBe('canceled');
    expect(db.prepare('SELECT stock_grams FROM products WHERE id = ?').get('p1').stock_grams).toBe(before);
    expect(verifyPaymentMock).not.toHaveBeenCalled();
  });

  it('verifies a successful payment and stores the reference id', async () => {
    verifyPaymentMock.mockResolvedValueOnce({ ok: true, refId: 'REF-123' });
    const orderId = createOrder({ authority: 'AUTH-OK', stockReserved: 100 });

    const res = await request(app).get('/api/payment/callback?Authority=AUTH-OK&Status=OK');
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain(`status=success&orderId=${orderId}`);
    expect(verifyPaymentMock).toHaveBeenCalledWith({ amountToman: 373000, authority: 'AUTH-OK' });
    expect(db.prepare('SELECT status, zarinpal_ref_id FROM orders WHERE id = ?').get(orderId)).toEqual({
      status: 'paid',
      zarinpal_ref_id: 'REF-123',
    });
  });

  it('returns a transient verification error to pending_payment without releasing reserved stock', async () => {
    verifyPaymentMock.mockRejectedValueOnce(new Error('temporary gateway error'));
    const before = db.prepare('SELECT stock_grams FROM products WHERE id = ?').get('p1').stock_grams;
    const orderId = createOrder({ authority: 'AUTH-RETRY', stockReserved: 100 });
    const reserved = db.prepare('SELECT stock_grams FROM products WHERE id = ?').get('p1').stock_grams;

    const res = await request(app).get('/api/payment/callback?Authority=AUTH-RETRY&Status=OK');
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain(`status=error&orderId=${orderId}`);
    expect(db.prepare('SELECT status FROM orders WHERE id = ?').get(orderId).status).toBe('pending_payment');
    expect(db.prepare('SELECT stock_grams FROM products WHERE id = ?').get('p1').stock_grams).toBe(reserved);
    expect(before).toBe(reserved + 100);
  });

  it('releases stock and marks the order failed when verification returns not ok', async () => {
    verifyPaymentMock.mockResolvedValueOnce({ ok: false, message: 'not paid' });
    const before = db.prepare('SELECT stock_grams FROM products WHERE id = ?').get('p1').stock_grams;
    const orderId = createOrder({ authority: 'AUTH-FAIL', stockReserved: 100 });
    const reserved = db.prepare('SELECT stock_grams FROM products WHERE id = ?').get('p1').stock_grams;

    const res = await request(app).get('/api/payment/callback?Authority=AUTH-FAIL&Status=OK');
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain(`status=failed&orderId=${orderId}`);
    expect(db.prepare('SELECT status FROM orders WHERE id = ?').get(orderId).status).toBe('failed');
    expect(db.prepare('SELECT stock_grams FROM products WHERE id = ?').get('p1').stock_grams).toBe(reserved + 100);
    expect(res.headers.location).not.toContain('status=success');
    expect(before).toBe(reserved + 100);
  });

  it('does not process a callback twice after the order is already finalized', async () => {
    verifyPaymentMock.mockResolvedValueOnce({ ok: true, refId: 'REF-ONCE' });
    const orderId = createOrder({ authority: 'AUTH-ONCE', stockReserved: 100 });

    await request(app).get('/api/payment/callback?Authority=AUTH-ONCE&Status=OK');
    const second = await request(app).get('/api/payment/callback?Authority=AUTH-ONCE&Status=OK');

    expect(second.status).toBe(302);
    expect(second.headers.location).toContain(`status=success&orderId=${orderId}`);
    expect(verifyPaymentMock).toHaveBeenCalledTimes(1);
  });
});
