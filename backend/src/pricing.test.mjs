import { describe, it, expect } from 'vitest';
import pricing from './pricing.js';

const {
  weights,
  roundPrice,
  priceForGrams,
  priceForWeight,
  computeMixPrice,
  computeMixProfile,
} = pricing;

describe('roundPrice', () => {
  it('rounds to the nearest 1000 toman', () => {
    expect(roundPrice(373450)).toBe(373000);
    expect(roundPrice(373500)).toBe(374000);
    expect(roundPrice(999)).toBe(1000);
  });
});

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

  it('extrapolates past the last breakpoint using the final segment slope (e.g. 2000g)', () => {
    const price1000 = priceForGrams(base, 1000);
    const price2000 = priceForGrams(base, 2000);
    expect(price2000).toBeGreaterThan(price1000);
  });

  it('clamps below-minimum grams up to the 250g floor', () => {
    expect(priceForGrams(base, 100)).toBe(priceForGrams(base, 250));
    expect(priceForGrams(base, 0)).toBe(priceForGrams(base, 250));
  });

  it('treats a non-numeric grams value as the 250g default rather than throwing', () => {
    expect(priceForGrams(base, 'not-a-number')).toBe(priceForGrams(base, 250));
  });
});

describe('priceForWeight', () => {
  const base = 373000;

  it('applies each weight tier multiplier', () => {
    weights.forEach((w, idx) => {
      expect(priceForWeight(base, idx)).toBe(roundPrice(base * w.mult));
    });
  });

  it('falls back to the first tier for an out-of-range index', () => {
    expect(priceForWeight(base, 99)).toBe(priceForWeight(base, 0));
  });
});

describe('computeMixPrice', () => {
  // Mirrors the shape orders.js builds: Map<productId, { price, profile }>.
  const productsById = new Map([
    ['p1', { price: 373000, profile: { body: 4, acidity: 2, sweetness: 3 } }],
    ['p7', { price: 610000, profile: { body: 2, acidity: 5, sweetness: 4 } }],
  ]);

  it('blends two products by percentage before applying the weight multiplier', () => {
    const mix = [{ productId: 'p1', pct: 60 }, { productId: 'p7', pct: 40 }];
    const expectedBase = 373000 * 0.6 + 610000 * 0.4;
    expect(computeMixPrice(mix, productsById, 0)).toBe(roundPrice(expectedBase * weights[0].mult));
    expect(computeMixPrice(mix, productsById, 1)).toBe(roundPrice(expectedBase * weights[1].mult));
  });

  it('treats a mix component referencing an unknown product as contributing zero price', () => {
    const mix = [{ productId: 'p1', pct: 50 }, { productId: 'does-not-exist', pct: 50 }];
    const expectedBase = 373000 * 0.5;
    expect(computeMixPrice(mix, productsById, 0)).toBe(roundPrice(expectedBase * weights[0].mult));
  });
});

describe('computeMixProfile', () => {
  const productsById = new Map([
    ['p1', { price: 373000, profile: { body: 4, acidity: 2, sweetness: 3 } }],
    ['p7', { price: 610000, profile: { body: 2, acidity: 5, sweetness: 4 } }],
  ]);

  it('blends taste profile fields by percentage', () => {
    const mix = [{ productId: 'p1', pct: 50 }, { productId: 'p7', pct: 50 }];
    const profile = computeMixProfile(mix, productsById);
    expect(profile.body).toBeCloseTo(3, 5);
    expect(profile.acidity).toBeCloseTo(3.5, 5);
    expect(profile.sweetness).toBeCloseTo(3.5, 5);
  });

  it('skips a mix component referencing an unknown product instead of throwing', () => {
    const mix = [{ productId: 'p1', pct: 100 }, { productId: 'does-not-exist', pct: 0 }];
    const profile = computeMixProfile(mix, productsById);
    expect(profile.body).toBeCloseTo(4, 5);
  });
});
