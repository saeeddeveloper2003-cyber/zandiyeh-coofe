const express = require('express');
const db = require('../db');

const router = express.Router();

function toApiShape(row) {
  return {
    id: row.id,
    image: row.image,
    name: row.name,
    origin: row.origin,
    roast: row.roast,
    desc: row.desc,
    price: row.price,
    tag: row.tag,
    profile: { body: row.body, acidity: row.acidity, sweetness: row.sweetness },
    stockGrams: row.stock_grams,
    inStock: row.stock_grams > 0,
  };
}

// GET /api/products
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM products WHERE active = 1 ORDER BY rowid').all();
  res.json({ products: rows.map(toApiShape) });
});

// GET /api/products/:id
router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM products WHERE id = ? AND active = 1').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'محصول پیدا نشد' });
  res.json({ product: toApiShape(row) });
});

module.exports = router;
