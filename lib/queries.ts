import { toPrefixTsQuery } from './search';
import { ConflictError } from './errors';
import type { CatalogParams } from './catalogParams';
import type { Supabase } from './supabase';
import {
  SUMMARY_COLUMNS,
  type PieceSummary,
  type PotteryItem,
  type PotteryPrivate,
  type Revision,
} from './types';

export const PAGE_SIZE = 24;
const BATCH = 1000;

function selectPottery(supabase: Supabase, columns: string, count?: 'exact') {
  return supabase.from('pottery').select(columns, count ? { count } : undefined);
}

type PotteryQuery = ReturnType<typeof selectPottery>;

function applyFilters(query: PotteryQuery, p: CatalogParams): PotteryQuery {
  let q = query.eq('status', p.archived ? 'Archived' : 'Active');
  if (p.region) q = q.eq('region', p.region);
  if (p.culture) q = q.eq('culture_id', p.culture);
  if (p.condition) q = q.eq('condition', p.condition);
  if (p.rarity) q = q.eq('rarity', p.rarity);
  if (p.originality) q = q.eq('originality', p.originality);
  if (p.caseId === 'none') q = q.is('case_id', null);
  else if (p.caseId) q = q.eq('case_id', p.caseId);
  if (p.to != null) q = q.lte('period_start_year', p.to);
  if (p.from != null) q = q.gte('period_end_year', p.from);
  if (p.review) q = q.neq('ai_fields', '{}');
  const ts = toPrefixTsQuery(p.q);
  if (ts) q = q.textSearch('search_tsv', ts, { config: 'simple' });
  return q;
}

export async function fetchCatalogPage(supabase: Supabase, p: CatalogParams, page: number) {
  let query = applyFilters(selectPottery(supabase, SUMMARY_COLUMNS, 'exact'), p);
  if (p.sort === 'age-asc' || p.sort === 'age-desc') {
    query = query.order('period_start_year', {
      ascending: p.sort === 'age-asc',
      nullsFirst: false,
    });
  } else if (p.sort === 'sku') {
    query = query.order('sku', { ascending: true });
  } else {
    query = query.order('created_at', { ascending: p.sort === 'oldest' });
  }
  const { data, count, error } = await query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
  if (error) throw error;
  return { items: (data ?? []) as unknown as PieceSummary[], count: count ?? 0 };
}

// PostgREST caps a single response at 1,000 rows — page through so views
// that need every piece (map, timeline, export) never silently truncate.
export async function fetchAll<T>(
  supabase: Supabase,
  columns: string,
  p: CatalogParams,
): Promise<T[]> {
  const rows: T[] = [];
  for (let start = 0; ; start += BATCH) {
    const { data, error } = await applyFilters(selectPottery(supabase, columns), p)
      .order('sku', { ascending: true })
      .range(start, start + BATCH - 1);
    if (error) throw error;
    rows.push(...((data ?? []) as unknown as T[]));
    if (!data || data.length < BATCH) return rows;
  }
}

export function fetchAllSummaries(supabase: Supabase, p: CatalogParams) {
  return fetchAll<PieceSummary>(supabase, SUMMARY_COLUMNS, p);
}

export async function fetchPiece(supabase: Supabase, idOrSku: string) {
  const isSku = /^P\d+$/i.test(idOrSku);
  const { data, error } = await supabase
    .from('pottery')
    .select('*')
    .eq(isSku ? 'sku' : 'id', isSku ? idOrSku.toUpperCase() : idOrSku)
    .maybeSingle();
  if (error) throw error;
  return data as PotteryItem | null;
}

export async function fetchPrivate(supabase: Supabase, potteryId: string) {
  const { data, error } = await supabase
    .from('pottery_private')
    .select('*')
    .eq('pottery_id', potteryId)
    .maybeSingle();
  if (error) throw error;
  return data as PotteryPrivate | null;
}

export async function savePrivate(supabase: Supabase, row: PotteryPrivate) {
  const { error } = await supabase.from('pottery_private').upsert(row);
  if (error) throw error;
}

export async function updatePiece(
  supabase: Supabase,
  item: PotteryItem,
  changes: Partial<PotteryItem>,
): Promise<PotteryItem> {
  if (!Object.keys(changes).length) return item;
  const { data, error } = await supabase
    .from('pottery')
    .update(changes)
    .eq('id', item.id)
    .eq('updated_at', item.updated_at)
    .select();
  if (error) throw error;
  if (!data?.length) throw new ConflictError();
  return data[0] as PotteryItem;
}

export async function logMove(
  supabase: Supabase,
  potteryId: string,
  fromCase: string | null,
  toCase: string,
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await supabase.from('location_history').insert({
    pottery_id: potteryId,
    from_case: fromCase,
    to_case: toCase,
    moved_by: user?.id ?? null,
  });
  if (error) throw error;
}

export async function fetchRevisions(supabase: Supabase, recordId: string) {
  const { data, error } = await supabase
    .from('record_revisions')
    .select('*')
    .eq('record_id', recordId)
    .order('changed_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as Revision[];
}

export async function fetchRelated(supabase: Supabase, item: PotteryItem) {
  const column = item.culture_id ? 'culture_id' : item.region ? 'region' : null;
  if (!column) return [];
  const { data, error } = await supabase
    .from('pottery')
    .select(SUMMARY_COLUMNS)
    .eq(column, (item.culture_id ?? item.region) as string)
    .eq('status', 'Active')
    .neq('id', item.id)
    .limit(6);
  if (error) throw error;
  return (data ?? []) as unknown as PieceSummary[];
}
