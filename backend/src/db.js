const path = require('path');
const Database = require('better-sqlite3');
const seedProducts = require('./data/seed-products');
const logger = require('./lib/logger');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'zandieh.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function addColumnIfMissing(table, column, definition) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!columns.some((entry) => entry.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

db.exec(`
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  image TEXT,
  name TEXT NOT NULL,
  origin TEXT,
  roast TEXT,
  desc TEXT,
  price INTEGER NOT NULL,       -- toman, per 250g base unit
  tag TEXT,
  body INTEGER,
  acidity INTEGER,
  sweetness INTEGER,
  stock_grams INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'customer',
  address TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_address TEXT NOT NULL,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  total_amount INTEGER NOT NULL,      -- toman
  status TEXT NOT NULL DEFAULT 'pending_payment', -- pending_payment | processing_payment | paid | failed | canceled
  -- processing_payment is a brief transitional state: the callback route
  -- claims 'pending_payment' -> 'processing_payment' atomically before
  -- doing any work, so two concurrent hits to the same callback can't both
  -- act on the same order (see routes/payment.js).
  zarinpal_authority TEXT,
  zarinpal_ref_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  paid_at TEXT,
  idempotency_key TEXT,
  payment_processing_started_at TEXT
);

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,                 -- 'product' | 'blend'
  name TEXT NOT NULL,
  weight_label TEXT,
  meta TEXT,
  grams_total INTEGER NOT NULL,       -- grams actually reserved/decremented from stock, summed across the mix
  unit_price INTEGER NOT NULL,        -- server-computed, toman
  qty INTEGER NOT NULL,
  composition TEXT                    -- JSON: [{productId, pct, grams}] for blends, null for plain products
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_orders_authority ON orders(zarinpal_authority);
`);

// Backward-compatible migration for databases created before authentication.
addColumnIfMissing('orders', 'user_id', 'TEXT REFERENCES users(id) ON DELETE SET NULL');
addColumnIfMissing('orders', 'idempotency_key', 'TEXT');
addColumnIfMissing('orders', 'payment_processing_started_at', 'TEXT');
db.exec('CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id)');
db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_user_idempotency ON orders(user_id, idempotency_key) WHERE idempotency_key IS NOT NULL');


function seed() {
  const count = db.prepare('SELECT COUNT(*) AS c FROM products').get().c;
  if (count > 0) return;
  const insert = db.prepare(`
    INSERT INTO products (id, image, name, origin, roast, desc, price, tag, body, acidity, sweetness, stock_grams)
    VALUES (@id, @image, @name, @origin, @roast, @desc, @price, @tag, @body, @acidity, @sweetness, @stockGrams)
  `);
  const insertMany = db.transaction((rows) => rows.forEach((r) => insert.run(r)));
  insertMany(seedProducts);
  logger.info(`Seeded ${seedProducts.length} products.`);
}

seed();

module.exports = db;
