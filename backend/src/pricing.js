/**
 * Pricing logic — ported 1:1 from the frontend's src/data/products.js.
 *
 * IMPORTANT: This is the single source of truth for prices. The client is
 * NEVER trusted to send a price. Every order recomputes price+total here,
 * from productId/grams/pct only.
 */

const weights = [
  { label: '۲۵۰ گرم', mult: 1 },
  { label: '۵۰۰ گرم', mult: 1.85 },
  { label: '۱ کیلوگرم', mult: 3.4 },
];

const GRAM_PRICE_BREAKPOINTS = [
  [250, 1],
  [500, 1.85],
  [1000, 3.4],
];

function roundPrice(n) {
  return Math.round(n / 1000) * 1000;
}

function multiplierForGrams(g) {
  const first = GRAM_PRICE_BREAKPOINTS[0];
  if (g <= first[0]) return first[1];
  for (let i = 0; i < GRAM_PRICE_BREAKPOINTS.length - 1; i++) {
    const [g1, m1] = GRAM_PRICE_BREAKPOINTS[i];
    const [g2, m2] = GRAM_PRICE_BREAKPOINTS[i + 1];
    if (g <= g2) return m1 + (m2 - m1) * (g - g1) / (g2 - g1);
  }
  const [g1, m1] = GRAM_PRICE_BREAKPOINTS[GRAM_PRICE_BREAKPOINTS.length - 2];
  const [g2, m2] = GRAM_PRICE_BREAKPOINTS[GRAM_PRICE_BREAKPOINTS.length - 1];
  const slope = (m2 - m1) / (g2 - g1);
  return m2 + slope * (g - g2);
}

function priceForGrams(basePrice, grams = 250) {
  const g = Math.max(250, Number(grams) || 250);
  return roundPrice(basePrice * multiplierForGrams(g));
}

function priceForWeight(basePrice, weightIdx = 0) {
  return roundPrice(basePrice * (weights[weightIdx] ?? weights[0]).mult);
}

/**
 * mix: [{ productId, pct }]
 * productsById: Map<productId, { price, profile }>
 */
function computeMixPrice(mix, productsById, weightIdx = 0) {
  const base = mix.reduce((sum, item) => {
    const p = productsById.get(item.productId);
    return sum + (p ? p.price : 0) * item.pct / 100;
  }, 0);
  return priceForWeight(base, weightIdx);
}

function computeMixProfile(mix, productsById) {
  const tasteKeys = ['body', 'acidity', 'sweetness'];
  return mix.reduce((acc, item) => {
    const p = productsById.get(item.productId);
    if (!p) return acc;
    tasteKeys.forEach((key) => { acc[key] += p.profile[key] * (item.pct / 100); });
    return acc;
  }, { body: 0, acidity: 0, sweetness: 0 });
}

module.exports = {
  weights,
  roundPrice,
  priceForGrams,
  priceForWeight,
  computeMixPrice,
  computeMixProfile,
};
