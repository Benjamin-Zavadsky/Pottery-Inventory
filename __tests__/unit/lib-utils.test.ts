import { describe, it, expect, vi, afterEach } from 'vitest';
import { errorMessage, ConflictError } from '@/lib/errors';
import { formatDateOnly, formatDateTime } from '@/lib/dates';
import { changedFields } from '@/lib/diff';
import { toCsv, downloadFile } from '@/lib/csv';
import { loadDraft, saveDraft, clearDraft } from '@/lib/draft';
import { toPrefixTsQuery } from '@/lib/search';
import { changedKeys, describeRevision } from '@/lib/revisions';
import type { Revision } from '@/lib/types';

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe('errorMessage', () => {
  it('reads Error instances, Supabase-style objects, and falls back', () => {
    expect(errorMessage(new Error('boom'))).toBe('boom');
    expect(errorMessage({ message: 'pg error' })).toBe('pg error');
    expect(errorMessage(null)).toBe('Something went wrong');
    expect(errorMessage({}, 'custom')).toBe('custom');
  });

  it('ConflictError explains the concurrent edit', () => {
    const err = new ConflictError();
    expect(err.name).toBe('ConflictError');
    expect(err.message).toMatch(/changed by someone else/);
  });
});

describe('dates', () => {
  it('renders date-only strings on the same calendar day in local time', () => {
    expect(formatDateOnly('2024-03-15')).toBe(new Date(2024, 2, 15).toLocaleDateString());
  });

  it('falls back to Date parsing for timestamps', () => {
    const ts = '2024-03-15T12:00:00Z';
    expect(formatDateOnly(ts)).toBe(new Date(ts).toLocaleDateString());
    expect(formatDateTime(ts)).toContain('2024');
  });
});

describe('changedFields', () => {
  it('returns only values that differ, comparing arrays and nulls structurally', () => {
    const before = { a: 1, b: ['x'], c: null as string | null, d: 'same' };
    expect(changedFields(before, { a: 2, b: ['x'], c: undefined, d: 'same' })).toEqual({ a: 2 });
    expect(changedFields(before, { b: ['y'] })).toEqual({ b: ['y'] });
  });
});

describe('csv', () => {
  it('escapes quotes, commas, newlines and joins arrays', () => {
    const csv = toCsv(
      [{ a: 'plain', b: 'has, comma', c: 'say "hi"', d: ['x', 'y'], e: null }],
      ['a', 'b', 'c', 'd', 'e'],
    );
    expect(csv).toBe('a,b,c,d,e\nplain,"has, comma","say ""hi""",x; y,');
  });

  it('downloads through a temporary object URL', () => {
    const create = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:x');
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    downloadFile('out.csv', 'a,b');
    expect(create).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
    expect(revoke).toHaveBeenCalledWith('blob:x');
  });
});

describe('draft storage', () => {
  it('round-trips JSON and clears', () => {
    saveDraft('k', { a: 1 });
    expect(loadDraft('k')).toEqual({ a: 1 });
    clearDraft('k');
    expect(loadDraft('k')).toBeNull();
  });

  it('degrades to "no draft" when storage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(loadDraft('k')).toBeNull();
    expect(() => saveDraft('k', 1)).not.toThrow();
    expect(() => clearDraft('k')).not.toThrow();
  });
});

describe('toPrefixTsQuery', () => {
  it('builds prefix terms and strips tsquery syntax', () => {
    expect(toPrefixTsQuery('Mimb bowl')).toBe('mimb:* & bowl:*');
    expect(toPrefixTsQuery("a & b | !c:* 'd'")).toBe('a:* & b:* & c:* & d:*');
    expect(toPrefixTsQuery('Taíno')).toBe('taíno:*');
    expect(toPrefixTsQuery('   ')).toBe('');
  });
});

describe('revisions', () => {
  const base: Revision = {
    id: 1,
    table_name: 'pottery',
    record_id: 'r',
    operation: 'UPDATE',
    changed_at: '2026-01-01T00:00:00Z',
    changed_by: null,
    old_row: { name: 'a', updated_at: '1', color: 'red' },
    new_row: { name: 'b', updated_at: '2', color: 'red' },
  };

  it('lists changed fields, ignoring bookkeeping columns', () => {
    expect(changedKeys(base)).toEqual(['name']);
    expect(describeRevision(base)).toBe('Changed name');
  });

  it('describes inserts, deletes, and no-op saves', () => {
    expect(describeRevision({ ...base, operation: 'INSERT', old_row: null })).toBe('Created');
    expect(describeRevision({ ...base, operation: 'DELETE', new_row: null })).toBe('Deleted');
    expect(changedKeys({ ...base, operation: 'INSERT' })).toEqual([]);
    expect(describeRevision({ ...base, new_row: base.old_row })).toBe('Saved (no field changes)');
    expect(changedKeys({ ...base, old_row: null, new_row: null })).toEqual([]);
  });
});
