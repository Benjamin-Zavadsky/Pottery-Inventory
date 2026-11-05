import { describe, it, expect, beforeEach } from 'vitest';
import {
  fetchAll,
  fetchCatalogPage,
  fetchPiece,
  fetchPrivate,
  fetchRelated,
  fetchRevisions,
  logMove,
  savePrivate,
  updatePiece,
  PAGE_SIZE,
} from '@/lib/queries';
import { DEFAULT_PARAMS } from '@/lib/catalogParams';
import { ConflictError } from '@/lib/errors';
import { createSupabaseMock } from '../support/supabaseMock';
import { makeItem } from '../support/fixtures';
import type { Supabase } from '@/lib/supabase';

const mock = createSupabaseMock();
const supabase = mock.supabase as unknown as Supabase;

beforeEach(() => {
  mock.reset();
  mock.setUser({ id: 'u1' });
});

describe('fetchCatalogPage', () => {
  it('applies every filter, sorts newest first and pages', async () => {
    mock.queueResult({ data: [makeItem()], count: 30 });
    const result = await fetchCatalogPage(
      supabase,
      {
        ...DEFAULT_PARAMS,
        q: 'jar',
        region: 'North America',
        culture: 'mississippian',
        condition: 'Good',
        rarity: 'Rare',
        originality: 'Unknown',
        caseId: 'A',
        from: -500,
        to: 1500,
        review: true,
      },
      1,
    );
    expect(result.count).toBe(30);
    const b = mock.lastBuilder();
    expect(b.eq).toHaveBeenCalledWith('status', 'Active');
    expect(b.eq).toHaveBeenCalledWith('region', 'North America');
    expect(b.eq).toHaveBeenCalledWith('culture_id', 'mississippian');
    expect(b.eq).toHaveBeenCalledWith('case_id', 'A');
    expect(b.lte).toHaveBeenCalledWith('period_start_year', 1500);
    expect(b.gte).toHaveBeenCalledWith('period_end_year', -500);
    expect(b.neq).toHaveBeenCalledWith('ai_fields', '{}');
    expect(b.textSearch).toHaveBeenCalledWith('search_tsv', 'jar:*', { config: 'simple' });
    expect(b.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(b.range).toHaveBeenCalledWith(PAGE_SIZE, PAGE_SIZE * 2 - 1);
  });

  it.each([
    ['age-asc', 'period_start_year', { ascending: true, nullsFirst: false }],
    ['age-desc', 'period_start_year', { ascending: false, nullsFirst: false }],
    ['sku', 'sku', { ascending: true }],
    ['oldest', 'created_at', { ascending: true }],
  ] as const)('sorts by %s', async (sort, column, opts) => {
    mock.queueResult({ data: null, count: null });
    const result = await fetchCatalogPage(
      supabase,
      { ...DEFAULT_PARAMS, sort, archived: true, caseId: 'none' },
      0,
    );
    expect(result).toEqual({ items: [], count: 0 });
    const b = mock.lastBuilder();
    expect(b.order).toHaveBeenCalledWith(column, opts);
    expect(b.eq).toHaveBeenCalledWith('status', 'Archived');
    expect(b.is).toHaveBeenCalledWith('case_id', null);
  });

  it('throws query errors', async () => {
    mock.queueResult({ error: { message: 'bad' } });
    await expect(fetchCatalogPage(supabase, DEFAULT_PARAMS, 0)).rejects.toEqual({ message: 'bad' });
  });
});

describe('fetchAll', () => {
  it('pages past the 1,000-row cap until a short page', async () => {
    mock.queueResult({ data: Array.from({ length: 1000 }, (_, i) => ({ i })) });
    mock.queueResult({ data: [{ i: 1000 }] });
    const rows = await fetchAll(supabase, 'id', DEFAULT_PARAMS);
    expect(rows).toHaveLength(1001);
    expect(mock.builders[1].range).toHaveBeenCalledWith(1000, 1999);
  });

  it('handles null data and errors', async () => {
    mock.queueResult({ data: null });
    expect(await fetchAll(supabase, 'id', DEFAULT_PARAMS)).toEqual([]);
    mock.queueResult({ error: { message: 'x' } });
    await expect(fetchAll(supabase, 'id', DEFAULT_PARAMS)).rejects.toEqual({ message: 'x' });
  });
});

describe('single-record queries', () => {
  it('looks pieces up by SKU or id', async () => {
    mock.queueResult({ data: makeItem() });
    await fetchPiece(supabase, 'p0001');
    expect(mock.lastBuilder().eq).toHaveBeenCalledWith('sku', 'P0001');
    mock.queueResult({ data: null });
    expect(await fetchPiece(supabase, 'uuid-1')).toBeNull();
    expect(mock.lastBuilder().eq).toHaveBeenCalledWith('id', 'uuid-1');
    mock.queueResult({ error: { message: 'x' } });
    await expect(fetchPiece(supabase, 'uuid-1')).rejects.toEqual({ message: 'x' });
  });

  it('reads and upserts private rows', async () => {
    mock.queueResult({ data: { pottery_id: 'p' } });
    expect(await fetchPrivate(supabase, 'p')).toEqual({ pottery_id: 'p' });
    mock.queueResult({ error: { message: 'rls' } });
    await expect(fetchPrivate(supabase, 'p')).rejects.toEqual({ message: 'rls' });
    const row = {
      pottery_id: 'p',
      acquisition_cost: 1,
      appraised_value: null,
      appraisal_date: null,
      appraiser_name: null,
      seller_donator: null,
    };
    mock.queueResult({});
    await savePrivate(supabase, row);
    expect(mock.lastBuilder().upsert).toHaveBeenCalledWith(row);
    mock.queueResult({ error: { message: 'no' } });
    await expect(savePrivate(supabase, row)).rejects.toEqual({ message: 'no' });
  });
});

describe('updatePiece', () => {
  const item = makeItem();

  it('skips the round-trip when nothing changed', async () => {
    expect(await updatePiece(supabase, item, {})).toBe(item);
    expect(mock.builders).toHaveLength(0);
  });

  it('guards with updated_at and returns the new row', async () => {
    mock.queueResult({ data: [{ ...item, name: 'New' }] });
    const updated = await updatePiece(supabase, item, { name: 'New' });
    expect(updated.name).toBe('New');
    expect(mock.lastBuilder().eq).toHaveBeenCalledWith('updated_at', item.updated_at);
  });

  it('raises a conflict when another edit landed first, and passes errors through', async () => {
    mock.queueResult({ data: [] });
    await expect(updatePiece(supabase, item, { name: 'x' })).rejects.toBeInstanceOf(ConflictError);
    mock.queueResult({ error: { message: 'check violation' } });
    await expect(updatePiece(supabase, item, { name: 'x' })).rejects.toEqual({
      message: 'check violation',
    });
  });
});

describe('history and related', () => {
  it('logs moves with the current user', async () => {
    mock.queueResult({});
    await logMove(supabase, 'p', null, 'A');
    expect(mock.lastBuilder().insert).toHaveBeenCalledWith({
      pottery_id: 'p',
      from_case: null,
      to_case: 'A',
      moved_by: 'u1',
    });
    mock.setUser(null);
    mock.queueResult({ error: { message: 'fk' } });
    await expect(logMove(supabase, 'p', 'A', 'B')).rejects.toEqual({ message: 'fk' });
  });

  it('fetches revisions newest first', async () => {
    mock.queueResult({ data: null });
    expect(await fetchRevisions(supabase, 'p')).toEqual([]);
    mock.queueResult({ error: { message: 'x' } });
    await expect(fetchRevisions(supabase, 'p')).rejects.toEqual({ message: 'x' });
  });

  it('finds related pieces by culture, then region, else none', async () => {
    mock.queueResult({ data: [makeItem({ id: 'other' })] });
    expect(await fetchRelated(supabase, makeItem())).toHaveLength(1);
    expect(mock.lastBuilder().eq).toHaveBeenCalledWith('culture_id', 'mississippian');
    mock.queueResult({ data: null });
    expect(await fetchRelated(supabase, makeItem({ culture_id: null }))).toEqual([]);
    expect(mock.lastBuilder().eq).toHaveBeenCalledWith('region', 'North America');
    expect(await fetchRelated(supabase, makeItem({ culture_id: null, region: null }))).toEqual([]);
    mock.queueResult({ error: { message: 'x' } });
    await expect(fetchRelated(supabase, makeItem())).rejects.toEqual({ message: 'x' });
  });
});
