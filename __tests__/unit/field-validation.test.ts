import { describe, it, expect } from 'vitest';

const CONDITIONS = ['Mint', 'Excellent', 'Good', 'Fair', 'Poor'];
const RARITIES = ['Common', 'Uncommon', 'Rare', 'Museum-Grade'];
const ORIGINALITIES = ['Authenticated Original', 'Suspected Original', 'Reproduction', 'Unknown'];

describe('condition validation', () => {
  it('accepts all valid condition values', () => {
    CONDITIONS.forEach((c) => expect(CONDITIONS.includes(c)).toBe(true));
  });

  it('rejects invalid values the AI might return', () => {
    expect(CONDITIONS.includes('Perfect')).toBe(false);
    expect(CONDITIONS.includes('Good Condition')).toBe(false);
    expect(CONDITIONS.includes('')).toBe(false);
  });
});

describe('rarity validation', () => {
  it('accepts all valid rarity values', () => {
    RARITIES.forEach((r) => expect(RARITIES.includes(r)).toBe(true));
  });

  it('rejects invalid values the AI might return', () => {
    expect(RARITIES.includes('Very Rare')).toBe(false);
    expect(RARITIES.includes('museum-grade')).toBe(false);
    expect(RARITIES.includes('')).toBe(false);
  });
});

describe('originality validation', () => {
  it('accepts all valid originality values', () => {
    ORIGINALITIES.forEach((o) => expect(ORIGINALITIES.includes(o)).toBe(true));
  });

  it('rejects invalid values the AI might return', () => {
    expect(ORIGINALITIES.includes('Original')).toBe(false);
    expect(ORIGINALITIES.includes('Authenticated')).toBe(false);
    expect(ORIGINALITIES.includes('authenticated original')).toBe(false);
    expect(ORIGINALITIES.includes('')).toBe(false);
  });
});
