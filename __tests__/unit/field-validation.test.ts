import { describe, it, expect } from 'vitest';
import { CONDITIONS, RARITIES, ORIGINALITIES } from '@/lib/constants';

// Widened to plain string[] so arbitrary (invalid) AI-returned strings can be checked below.
const conditionValues: readonly string[] = CONDITIONS;
const rarityValues: readonly string[] = RARITIES;
const originalityValues: readonly string[] = ORIGINALITIES;

describe('condition validation', () => {
  it('accepts all valid condition values', () => {
    CONDITIONS.forEach((c) => expect(CONDITIONS.includes(c)).toBe(true));
  });

  it('rejects invalid values the AI might return', () => {
    expect(conditionValues.includes('Perfect')).toBe(false);
    expect(conditionValues.includes('Good Condition')).toBe(false);
    expect(conditionValues.includes('')).toBe(false);
  });
});

describe('rarity validation', () => {
  it('accepts all valid rarity values', () => {
    RARITIES.forEach((r) => expect(RARITIES.includes(r)).toBe(true));
  });

  it('rejects invalid values the AI might return', () => {
    expect(rarityValues.includes('Very Rare')).toBe(false);
    expect(rarityValues.includes('museum-grade')).toBe(false);
    expect(rarityValues.includes('')).toBe(false);
  });
});

describe('originality validation', () => {
  it('accepts all valid originality values', () => {
    ORIGINALITIES.forEach((o) => expect(ORIGINALITIES.includes(o)).toBe(true));
  });

  it('rejects invalid values the AI might return', () => {
    expect(originalityValues.includes('Original')).toBe(false);
    expect(originalityValues.includes('Authenticated')).toBe(false);
    expect(originalityValues.includes('authenticated original')).toBe(false);
    expect(originalityValues.includes('')).toBe(false);
  });
});
