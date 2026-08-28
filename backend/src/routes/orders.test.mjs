import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

import pricing from '../pricing.js';

// zarinpal.js makes real network calls — for these tests we replace it with
// a mock so we can control success/failure without hitting the real (or
// sandbox) gateway. Registered once at module scope; each test configures
// the mock's behavior in beforeEach/individually.
const requestPaymentMock = vi.fn();
const verifyPaymentMock = vi.fn();
vi.mock('../services/zarinpal', () => ({
  requestPayment: (...args) => requestPaymentMock(...args),
  verifyPayment: (...args) => verifyPaymentMock(...args),
  paymentUrlForAuthority: (authority) => `https://sandbox.zarinpal.com/pg/StartPay/${authority}`,
}));

let db;
let dbPath;
let app;
let auth;
let authToken;

// Every test gets its own on-disk SQLite file (via DB_PATH) and a fresh
// require of db.js/orders.js, so seeded stock from one test never leaks
// into another and tests can run in any order.
async function freshApp() {
  vi.resetModules();
  dbPath = path.join(os.tmpdir(), `zandieh-test-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
  process.env.DB_PATH = dbPath;
  process.env.BACKEND_PUBLIC_URL = 'http://localhost:4000';

  const dbModulePath = require.resolve('../db.js');
  delete require.cache[dbModulePath];
  db = require('../db.js');
  const authModule = await import('../auth.js');
  auth = authModule.default;
  const { default: ordersRouter } = await import('./orders.js');

  app = express();
  app.use(express.json());
  app.use('/api/orders', ordersRouter);
  const user = auth.createUser({ name: 'مریم رضایی', phone: '09121234567', password: 'StrongPass123' });
  authToken = auth.createSession(user.id).token;
}

function baseCustomer() {
  return { name: 'مریم رضایی', phone: '09121234567', address: 'تهران، خیابان آزادی، پلاک ۱۲' };
}

function getProduct(id) {
  return db.prepare('SELECT * FROM products WHERE id = ?').get(id);
}

function getOrder(id) {
  return db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
}

beforeEach(async () => {
  requestPaymentMock.mockReset();
  verifyPaymentMock.mockReset();
  requestPaymentMock.mockResolvedValue({
    authority: 'A-TEST-AUTHORITY',
    url: 'https://sandbox.zarinpal.com/pg/StartPay/A-TEST-AUTHORITY',
  });
  await freshApp();
});

afterEach(() => {
  if (db && db.open) db.close();
  for (const suffix of ['', '-wal', '-shm']) {
    try { fs.unlinkSync(dbPath + suffix); } catch { /* not created, fine */ }
  }
});

describe('POST /api/orders — authentication', () => {
  it('rejects anonymous order creation', async () => {
    const res = await request(app).post('/api/orders').send({ customer: baseCustomer(), items: [{ kind: 'product', productId: 'p1', grams: 250, qty: 1 }] });
    expect(res.status).toBe(401);
  });

  it('does not expose another user\'s order by id', async () => {
    const created = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ customer: baseCustomer(), items: [{ kind: 'product', productId: 'p1', grams: 250, qty: 1 }] });
    expect(created.status).toBe(200);

    const otherUser = auth.createUser({ name: 'کاربر دوم', phone: '09129876543', password: 'StrongPass123' });
    const otherToken = auth.createSession(otherUser.id).token;
    const res = await request(app).get(`/api/orders/${created.body.orderId}`).set('Authorization', `Bearer ${otherToken}`);
    expect(res.status).toBe(403);
  });
});

describe('POST /api/orders — request validation and idempotency', () => {
  it('rejects product weights that are not multiples of 250g instead of silently rounding them', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        customer: baseCustomer(),
        items: [{ kind: 'product', productId: 'p1', grams: 375, qty: 1 }],
      });
    expect(res.status).toBe(400);
  });

  it('returns the same payment attempt for a repeated idempotency key', async () => {
    const payload = {
      customer: baseCustomer(),
      items: [{ kind: 'product', productId: 'p1', grams: 250, qty: 1 }],
    };
    const first = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${authToken}`)
      .set('Idempotency-Key', 'checkout-test-key-123')
      .send(payload);
    const second = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${authToken}`)
      .set('Idempotency-Key', 'checkout-test-key-123')
      .send(payload);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(second.body.orderId).toBe(first.body.orderId);
    expect(requestPaymentMock).toHaveBeenCalledTimes(1);
    expect(db.prepare('SELECT COUNT(*) AS c FROM orders').get().c).toBe(1);
  });

  it('allows reusing an idempotency key after a pre-gateway failure', async () => {
    requestPaymentMock.mockRejectedValueOnce(new Error('gateway unreachable'));
    const payload = {
      customer: baseCustomer(),
      items: [{ kind: 'product', productId: 'p1', grams: 250, qty: 1 }],
    };
    const first = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${authToken}`)
      .set('Idempotency-Key', 'checkout-retry-key-123')
      .send(payload);
    expect(first.status).toBe(502);

    const second = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${authToken}`)
      .set('Idempotency-Key', 'checkout-retry-key-123')
      .send(payload);
    expect(second.status).toBe(200);
    expect(requestPaymentMock).toHaveBeenCalledTimes(2);
  });
});

describe('POST /api/orders — pricing', () => {
  it('computes the total server-side from productId/grams, ignoring any price the client sends', async () => {
    const p1 = getProduct('p1');
    const expectedUnitPrice = pricing.priceForGrams(p1.price, 500);

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        customer: baseCustomer(),
        items: [
          // A malicious/buggy client sending its own "price" must have zero
          // effect — the schema doesn't even define that field.
          { kind: 'product', productId: 'p1', grams: 500, qty: 1, price: 1 },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(expectedUnitPrice);
    // Also assert the gateway itself was asked to charge the real amount.
    expect(requestPaymentMock).toHaveBeenCalledWith(
      expect.objectContaining({ amountToman: expectedUnitPrice }),
    );
  });

  it('prices a blend from each component\'s pct and the target weight, matching pricing.js directly', async () => {
    const p1 = getProduct('p1');
    const p7 = getProduct('p7');
    const productsById = new Map([
      ['p1', { price: p1.price }],
      ['p7', { price: p7.price }],
    ]);
    const expectedUnitPrice = pricing.computeMixPrice(
      [{ productId: 'p1', pct: 60 }, { productId: 'p7', pct: 40 }],
      productsById,
      0,
    );

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        customer: baseCustomer(),
        items: [{
          kind: 'blend',
          weightIdx: 0,
          mix: [{ productId: 'p1', pct: 60 }, { productId: 'p7', pct: 40 }],
          qty: 1,
        }],
      });

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(expectedUnitPrice);
  });

  it('rejects blend percentages totaling 99 or 101', async () => {
    for (const mix of [
      [{ productId: 'p1', pct: 50 }, { productId: 'p7', pct: 49 }],
      [{ productId: 'p1', pct: 50 }, { productId: 'p7', pct: 51 }],
    ]) {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          customer: baseCustomer(),
          items: [{ kind: 'blend', weightIdx: 0, mix, qty: 1 }],
        });
      expect(res.status).toBe(400);
    }
  });

  it('rejects a blend whose percentages don\'t sum to 100', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        customer: baseCustomer(),
        items: [{
          kind: 'blend',
          weightIdx: 0,
          mix: [{ productId: 'p1', pct: 60 }, { productId: 'p7', pct: 30 }],
          qty: 1,
        }],
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/۱۰۰/);
  });

  it('rejects malformed input (e.g. missing customer fields) with 400', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ customer: { name: 'X' }, items: [] });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
  });
});

describe('POST /api/orders — stock reservation', () => {
  it('decrements stock atomically for a plain product line', async () => {
    const before = getProduct('p1');

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        customer: baseCustomer(),
        items: [{ kind: 'product', productId: 'p1', grams: 500, qty: 2 }],
      });

    expect(res.status).toBe(200);
    const after = getProduct('p1');
    expect(after.stock_grams).toBe(before.stock_grams - 500 * 2);
  });

  it('allocates a three-way blend so component reservations add up exactly to the target weight', async () => {
    const before = {
      p1: getProduct('p1').stock_grams,
      p7: getProduct('p7').stock_grams,
      p9: getProduct('p9').stock_grams,
    };

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        customer: baseCustomer(),
        items: [{
          kind: 'blend',
          weightIdx: 0,
          mix: [
            { productId: 'p1', pct: 33 },
            { productId: 'p7', pct: 33 },
            { productId: 'p9', pct: 34 },
          ],
          qty: 1,
        }],
      });

    expect(res.status).toBe(200);
    expect(getProduct('p1').stock_grams).toBe(before.p1 - 83);
    expect(getProduct('p7').stock_grams).toBe(before.p7 - 83);
    expect(getProduct('p9').stock_grams).toBe(before.p9 - 84);

    const item = db.prepare('SELECT grams_total, composition FROM order_items WHERE order_id = ?').get(res.body.orderId);
    expect(item.grams_total).toBe(250);
    expect(JSON.parse(item.composition).reduce((sum, part) => sum + part.grams, 0)).toBe(250);
  });

  it('decrements stock proportionally for each component of a blend', async () => {
    const p1Before = getProduct('p1');
    const p7Before = getProduct('p7');

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        customer: baseCustomer(),
        items: [{
          kind: 'blend',
          weightIdx: 0, // 250g
          mix: [{ productId: 'p1', pct: 60 }, { productId: 'p7', pct: 40 }],
          qty: 1,
        }],
      });

    expect(res.status).toBe(200);
    expect(getProduct('p1').stock_grams).toBe(p1Before.stock_grams - 150); // 250 * 0.6
    expect(getProduct('p7').stock_grams).toBe(p7Before.stock_grams - 100); // 250 * 0.4
  });

  it('returns 409 with the available/requested amounts when stock is insufficient', async () => {
    const p9 = getProduct('p9'); // seeded with stock_grams: 7000

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        customer: baseCustomer(),
        items: [{ kind: 'product', productId: 'p9', grams: 1000, qty: 8 }], // 8000g > 7000g stock
      });

    expect(res.status).toBe(409);
    expect(res.body.productId).toBe('p9');
    expect(res.body.available).toBe(p9.stock_grams);
    expect(res.body.requested).toBe(8000);

    // Nothing should have been reserved on a rejected order.
    expect(getProduct('p9').stock_grams).toBe(p9.stock_grams);
  });
});

describe('POST /api/orders — payment gateway failure', () => {
  it('rolls back reserved stock and marks the order failed when Zarinpal request fails', async () => {
    requestPaymentMock.mockRejectedValueOnce(new Error('gateway unreachable'));
    const before = getProduct('p1');

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        customer: baseCustomer(),
        items: [{ kind: 'product', productId: 'p1', grams: 500, qty: 1 }],
      });

    expect(res.status).toBe(502);

    // Stock reserved during the DB transaction must be released again.
    expect(getProduct('p1').stock_grams).toBe(before.stock_grams);

    // The order row itself (created before the gateway call) should be
    // left around as 'failed', not stuck as 'pending_payment'.
    const orders = db.prepare("SELECT * FROM orders WHERE status = 'failed'").all();
    expect(orders).toHaveLength(1);
  });
});

describe('GET /api/orders/:id', () => {
  it('returns 404 for an unknown order id', async () => {
    const res = await request(app).get('/api/orders/does-not-exist').set('Authorization', `Bearer ${authToken}`);
    expect(res.status).toBe(404);
  });

  it('returns order + line items after a successful order creation', async () => {
    const createRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        customer: baseCustomer(),
        items: [{ kind: 'product', productId: 'p1', grams: 250, qty: 1 }],
      });

    const { orderId } = createRes.body;
    const res = await request(app).get(`/api/orders/${orderId}`).set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.order.id).toBe(orderId);
    expect(res.body.order.status).toBe('pending_payment');
    expect(res.body.items).toHaveLength(1);
  });
});
