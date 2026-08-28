// Product data now comes from the backend (see src/hooks/useProducts.js) —
// this file only keeps the pure pricing math, which stays identical to what
// the server independently recomputes in src/pricing.js. Client-side numbers
// here are for display only; the backend is what actually charges the order.
export const weights = [
  { label:'۲۵۰ گرم', mult:1 },
  { label:'۵۰۰ گرم', mult:1.85 },
  { label:'۱ کیلوگرم', mult:3.4 },
];
export const signatureBlend = [{productId:'p7', pct:60}, {productId:'p5', pct:40}];
export const tasteLabels = [
  {key:'body', label:'بدنه'},
  {key:'acidity', label:'اسیدیته'},
  {key:'sweetness', label:'شیرینی'},
];
export function findProduct(id, products){ return products.find(p => p.id === id); }
export function roundPrice(n){ return Math.round(n / 1000) * 1000; }
export function priceForWeight(basePrice, weightIdx=0){ return roundPrice(basePrice * (weights[weightIdx] ?? weights[0]).mult); }
// Anchor points (grams, multiplier over the 250g base price) that pin down the
// known price tiers. Everything in between and beyond is interpolated so the
// price scales smoothly with no jumps, and bulk orders keep getting a better
// per-gram rate instead of an erratic one.
const GRAM_PRICE_BREAKPOINTS = [
  [250, 1],
  [500, 1.85],
  [1000, 3.4],
];
function multiplierForGrams(g){
  const first = GRAM_PRICE_BREAKPOINTS[0];
  if (g <= first[0]) return first[1];
  for (let i = 0; i < GRAM_PRICE_BREAKPOINTS.length - 1; i++){
    const [g1, m1] = GRAM_PRICE_BREAKPOINTS[i];
    const [g2, m2] = GRAM_PRICE_BREAKPOINTS[i + 1];
    if (g <= g2) return m1 + (m2 - m1) * (g - g1) / (g2 - g1);
  }
  // Beyond the last breakpoint, continue at the same rate as the last segment
  // so larger orders keep getting smoothly (not punitively) more expensive.
  const [g1, m1] = GRAM_PRICE_BREAKPOINTS[GRAM_PRICE_BREAKPOINTS.length - 2];
  const [g2, m2] = GRAM_PRICE_BREAKPOINTS[GRAM_PRICE_BREAKPOINTS.length - 1];
  const slope = (m2 - m1) / (g2 - g1);
  return m2 + slope * (g - g2);
}
export function priceForGrams(basePrice, grams=250){
  const g = Math.max(250, Number(grams) || 250);
  return roundPrice(basePrice * multiplierForGrams(g));
}
export function formatGrams(grams){
  const g = Number(grams);
  return g >= 1000 && g % 1000 === 0 ? `${(g/1000).toLocaleString('fa-IR')} کیلوگرم` : `${g.toLocaleString('fa-IR')} گرم`;
}
export function formatToman(amount){ return `${Math.round(amount).toLocaleString('fa-IR')} تومان`; }
export function computeMixProfile(mix, products){
  return mix.reduce((acc, item) => {
    const p = findProduct(item.productId, products); if (!p) return acc;
    tasteLabels.forEach(({key}) => acc[key] += p.profile[key] * (item.pct/100));
    return acc;
  }, {body:0, acidity:0, sweetness:0});
}
export function computeMixPrice(mix, products, weightIdx=0){
  const base = mix.reduce((sum, item) => sum + (findProduct(item.productId, products)?.price ?? 0) * item.pct/100, 0);
  return priceForWeight(base, weightIdx);
}
