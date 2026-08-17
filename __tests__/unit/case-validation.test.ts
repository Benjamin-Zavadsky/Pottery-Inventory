import { describe, it, expect } from 'vitest';
import { CASES, CASE_IDS } from '@/lib/constants';

describe('CASES constant', () => {
  it('has exactly 6 entries', () => {
    expect(CASES).toHaveLength(6);
  });

  it('contains all expected IDs', () => {
    const ids = CASES.map((c) => c.id);
    expect(ids).toContain('A');
    expect(ids).toContain('B');
    expect(ids).toContain('C');
    expect(ids).toContain('D');
    expect(ids).toContain('B-top');
    expect(ids).toContain('C-top');
  });

  it('every case has a non-empty name and description', () => {
    for (const c of CASES) {
      expect(c.name.length).toBeGreaterThan(0);
      expect(c.description.length).toBeGreaterThan(0);
    }
  });
});

describe('CASE_IDS validation', () => {
  it('accepts valid case IDs', () => {
    for (const id of ['A', 'B', 'C', 'D', 'B-top', 'C-top']) {
      expect(CASE_IDS.includes(id as (typeof CASE_IDS)[number])).toBe(true);
    }
  });

  it('rejects invalid case IDs', () => {
    for (const id of ['', 'E', 'a', 'b-top', 'case-1', 'null']) {
      expect(CASE_IDS.includes(id as (typeof CASE_IDS)[number])).toBe(false);
    }
  });

  it('CASE_IDS matches CASES map', () => {
    expect(CASE_IDS).toHaveLength(CASES.length);
    for (const c of CASES) {
      expect(CASE_IDS.includes(c.id as (typeof CASE_IDS)[number])).toBe(true);
    }
  });
});
