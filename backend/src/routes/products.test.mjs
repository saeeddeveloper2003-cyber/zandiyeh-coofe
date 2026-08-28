import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let db;
let dbPath;
let app;

async function freshApp() {
  vi.resetModules();
  dbPath = path.join(os.tmpdir(), `zandieh-products-test-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
  process.env.DB_PATH = dbPath;
  const dbModulePath = require.resolve('../db.js');
  delete require.cache[dbModulePath];
  db = require('../db.js');
  const { default: productsRouter } = await import('./products.js');
  app = express();
  app.use('/api/products', productsRouter);
}

beforeEach(async () => {
  await freshApp();
});

afterEach(() => {
  if (db && db.open) db.close();
  for (const suffix of ['', '-wal', '-shm']) {
    try { fs.unlinkSync(dbPath + suffix); } catch { /* ignore */ }
  }
});

describe('GET /api/products', () => {
  it('returns active products in API shape', async () => {
    const res = await request(app).get('/api/products');
    expect(res.status).toBe(200);
    expect(res.body.products).toHaveLength(10);
    expect(res.body.products[0]).toEqual(expect.objectContaining({
      id: 'p1',
      name: 'چری',
      price: 373000,
      stockGrams: 15000,
      inStock: true,
      profile: { body: 4, acidity: 2, sweetness: 3 },
    }));
  });

  it('does not expose inactive products', async () => {
    db.prepare('UPDATE products SET active = 0 WHERE id = ?').run('p1');
    const res = await request(app).get('/api/products');
    expect(res.status).toBe(200);
    expect(res.body.products.some((product) => product.id === 'p1')).toBe(false);
    expect(res.body.products).toHaveLength(9);
  });
});

describe('GET /api/products/:id', () => {
  it('returns a single active product', async () => {
    const res = await request(app).get('/api/products/p7');
    expect(res.status).toBe(200);
    expect(res.body.product).toEqual(expect.objectContaining({
      id: 'p7',
      name: 'ایتوپی',
      price: 610000,
      stockGrams: 11000,
      inStock: true,
    }));
  });

  it('returns 404 for unknown or inactive products', async () => {
    expect((await request(app).get('/api/products/not-found')).status).toBe(404);
    db.prepare('UPDATE products SET active = 0 WHERE id = ?').run('p7');
    const res = await request(app).get('/api/products/p7');
    expect(res.status).toBe(404);
  });
});
