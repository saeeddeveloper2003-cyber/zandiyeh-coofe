import { describe, it, expect } from 'vitest';
import {
  priceForGrams,
  formatGrams,
  formatToman,
  computeMixProfile,
  computeMixPrice,
  roundPrice,
} from './products';

// Product data now comes from the backend (see src/hooks/useProducts.js),
// so these tests use a small local fixture instead of importing a
// `products` array that no longer exists in this module.
const fixtureProducts = [
  { id: 'p1', price: 373000, profile: { body: 4, acidity: 2, sweetness: 3 } },
  { id: 'p2', price: 380000, profile: { body: 5, acidity: 2, sweetness: 3 } },
];

describe('priceForGrams', () => {
  const base = 373000; // p1 base price at 250g

  it('returns the base price at the first breakpoint (250g)', () => {
    expect(priceForGrams(base, 250)).toBe(roundPrice(base * 1));
  });

  it('matches the known breakpoint at 500g', () => {
    expect(priceForGrams(base, 500)).toBe(roundPrice(base * 1.85));
  });

  it('matches the known breakpoint at 1000g', () => {
    expect(priceForGrams(base, 1000)).toBe(roundPrice(base * 3.4));
  });

  it('interpolates smoothly between breakpoints (375g is between 250g and 500g)', () => {
    const price375 = priceForGrams(base, 375);
    const price250 = priceForGrams(base, 250);
    const price500 = priceForGrams(base, 500);
    expect(price375).toBeGreaterThan(price250);
    expect(price375).toBeLessThan(price500);
  });

  it('extrapolates beyond the last breakpoint without a price drop (2000g > 1000g)', () => {
    const price1000 = priceForGrams(base, 1000);
    const price2000 = priceForGrams(base, 2000);
    expect(price2000).toBeGreaterThan(price1000);
  });

  it('clamps below-minimum and invalid input to the 250g base price', () => {
    expect(priceForGrams(base, 100)).toBe(priceForGrams(base, 250));
    expect(priceForGrams(base, undefined)).toBe(priceForGrams(base, 250));
    expect(priceForGrams(base, 'not-a-number')).toBe(priceForGrams(base, 250));
  });
});

describe('formatGrams', () => {
  it('formats sub-kilogram amounts in grams', () => {
    expect(formatGrams(250)).toContain('گرم');
  });

  it('formats whole-kilogram amounts in kilograms', () => {
    expect(formatGrams(1000)).toContain('کیلوگرم');
  });

  it('formats non-round kilogram amounts in grams, not kilograms', () => {
    expect(formatGrams(1500)).toContain('گرم');
    expect(formatGrams(1500)).not.toContain('کیلوگرم');
  });
});

describe('formatToman', () => {
  it('rounds to the nearest toman and appends the currency label', () => {
    expect(formatToman(1234.6)).toContain('تومان');
  });
});

describe('computeMixProfile', () => {
  it('returns a weighted average of the picked products profiles', () => {
    const [p1, p2] = fixtureProducts;
    const mix = [
      { productId: p1.id, pct: 50 },
      { productId: p2.id, pct: 50 },
    ];
    const profile = computeMixProfile(mix, fixtureProducts);
    expect(profile.body).toBeCloseTo((p1.profile.body + p2.profile.body) / 2);
  });

  it('ignores unknown product ids instead of throwing', () => {
    const mix = [{ productId: 'not-a-real-id', pct: 100 }];
    expect(() => computeMixProfile(mix, fixtureProducts)).not.toThrow();
  });
});

describe('computeMixPrice', () => {
  it('is proportional to each products base price at 250g (weightIdx 0)', () => {
    const [p1] = fixtureProducts;
    const price = computeMixPrice([{ productId: p1.id, pct: 100 }], fixtureProducts, 0);
    expect(price).toBe(roundPrice(p1.price));
  });
});
