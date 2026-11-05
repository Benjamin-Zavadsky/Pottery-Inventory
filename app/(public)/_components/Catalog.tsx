'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { useUser } from '@/lib/useUser';
import { CASES, type Region } from '@/lib/constants';
import {
  DEFAULT_PARAMS,
  SORT_OPTIONS,
  VIEW_MODES,
  activeFilterCount,
  parseCatalogParams,
  toSearchString,
  type CatalogParams,
  type SortKey,
  type ViewMode,
} from '@/lib/catalogParams';
import { fetchAll, fetchAllSummaries, fetchCatalogPage, PAGE_SIZE } from '@/lib/queries';
import { analyzeInBackground } from '@/lib/aiClient';
import { cultureFor, regionFor } from '@/lib/taxonomy';
import { errorMessage } from '@/lib/errors';
import { STATS_COLUMNS, type PieceSummary } from '@/lib/types';
import AppHeader from '@/components/AppHeader';
import BottomNav from '@/components/BottomNav';
import PieceCard from '@/components/PieceCard';
import { Button } from '@/components/ui/Button';
import { Icon, type IconName } from '@/components/ui/Icon';
import { inputClass } from '@/components/ui/Field';
import { CardGridSkeleton, Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import CatalogHero, { type HeroStats } from './CatalogHero';
import FilterSheet from './FilterSheet';
import ActiveFilters from './ActiveFilters';
import BulkBar from './BulkBar';

const ViewLoading = () => <Skeleton className="h-[60vh] w-full rounded-2xl" />;
const InventoryMap = dynamic(() => import('@/components/InventoryMap'), {
  ssr: false,
  loading: ViewLoading,
});
const InventoryTimeline = dynamic(() => import('@/components/InventoryTimeline'), {
  ssr: false,
  loading: ViewLoading,
});
const InventoryTree = dynamic(() => import('@/components/InventoryTree'), {
  ssr: false,
  loading: ViewLoading,
});
const InventoryCase = dynamic(() => import('@/components/InventoryCase'), {
  ssr: false,
  loading: ViewLoading,
});

const VIEW_ICONS: Record<ViewMode, IconName> = {
  grid: 'grid',
  map: 'globe',
  timeline: 'timeline',
  tree: 'tree',
  case: 'case',
};

type StatRow = Pick<
  PieceSummary,
  'culture_id' | 'tribe_culture' | 'region' | 'period_start_year' | 'period_end_year'
>;

function computeStats(rows: StatRow[]): HeroStats {
  const byRegion: Partial<Record<Region, number>> = {};
  const cultures = new Set<string>();
  let earliest: number | null = null;
  let latest: number | null = null;
  for (const row of rows) {
    const region = regionFor(row);
    if (region) byRegion[region] = (byRegion[region] ?? 0) + 1;
    const culture = cultureFor(row);
    if (culture) cultures.add(culture.id);
    const s = row.period_start_year ?? row.period_end_year;
    const e = row.period_end_year ?? row.period_start_year;
    if (s != null && (earliest == null || s < earliest)) earliest = s;
    if (e != null && (latest == null || e > latest)) latest = e;
  }
  return { total: rows.length, cultures: cultures.size, byRegion, earliest, latest };
}

export default function Catalog() {
  const supabase = useMemo(() => createClient(), []);
  const { user } = useUser(supabase);
  const toast = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useMemo(
    () => parseCatalogParams(new URLSearchParams(searchParams.toString())),
    [searchParams],
  );
  const dataKey = toSearchString({ ...params, view: 'grid' });

  const [query, setQuery] = useState(params.q);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [items, setItems] = useState<PieceSummary[]>([]);
  const [count, setCount] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [all, setAll] = useState<{ key: string; items: PieceSummary[] } | null>(null);
  const [stats, setStats] = useState<HeroStats | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const requestId = useRef(0);
  const sentinel = useRef<HTMLDivElement>(null);

  const setParams = useCallback(
    (patch: Partial<CatalogParams>) => {
      router.replace(`/${toSearchString({ ...params, ...patch })}`, { scroll: false });
    },
    [params, router],
  );

  const clearFilters = useCallback(() => {
    setQuery('');
    router.replace(
      `/${toSearchString({ ...DEFAULT_PARAMS, view: params.view, sort: params.sort })}`,
      {
        scroll: false,
      },
    );
  }, [params.view, params.sort, router]);

  useEffect(() => {
    if (query === params.q) return;
    const t = setTimeout(() => setParams({ q: query }), 300);
    return () => clearTimeout(t);
  }, [query, params.q, setParams]);

  const loadPage = useCallback(
    async (nextPage: number) => {
      const id = ++requestId.current;
      setLoading(true);
      try {
        const result = await fetchCatalogPage(supabase, params, nextPage);
        if (id !== requestId.current) return;
        setItems((prev) => (nextPage === 0 ? result.items : [...prev, ...result.items]));
        setCount(result.count);
        setPage(nextPage);
        setError(null);
      } catch (err) {
        if (id === requestId.current) setError(errorMessage(err, 'Could not load the collection'));
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    },
    [supabase, params],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on filter change
    if (params.view === 'grid') loadPage(0);
  }, [loadPage, params.view]);

  useEffect(() => {
    if (params.view === 'grid' || all?.key === dataKey) return;
    fetchAllSummaries(supabase, params)
      .then((list) => setAll({ key: dataKey, items: list }))
      .catch((err) => setError(errorMessage(err, 'Could not load the collection')));
  }, [params, dataKey, all?.key, supabase]);

  useEffect(() => {
    fetchAll<StatRow>(supabase, STATS_COLUMNS, DEFAULT_PARAMS)
      .then((rows) => setStats(computeStats(rows)))
      .catch(() => setStats(null));
  }, [supabase]);

  const hasMore = count != null && items.length < count;

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasMore || loading || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => entries[0]?.isIntersecting && loadPage(page + 1),
      { rootMargin: '600px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loading, loadPage, page]);

  const filterCount = activeFilterCount(params);
  const showHero = !params.q && filterCount === 0 && params.view === 'grid';
  const staff = !!user;

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function endBulk() {
    setSelecting(false);
    setSelected(new Set());
  }

  async function runBulk(action: () => Promise<string>) {
    setBulkBusy(true);
    try {
      toast.success(await action());
      endBulk();
      loadPage(0);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBulkBusy(false);
    }
  }

  const chosen = () => items.filter((i) => selected.has(i.id));

  function bulkMove(caseId: string) {
    return runBulk(async () => {
      const pieces = chosen();
      const { error: err } = await supabase
        .from('pottery')
        .update({ case_id: caseId })
        .in(
          'id',
          pieces.map((p) => p.id),
        );
      if (err) throw err;
      const moves = pieces
        .filter((p) => p.case_id !== caseId)
        .map((p) => ({
          pottery_id: p.id,
          from_case: p.case_id,
          to_case: caseId,
          moved_by: user?.id ?? null,
        }));
      if (moves.length) {
        const { error: logErr } = await supabase.from('location_history').insert(moves);
        if (logErr) throw logErr;
      }
      return `Moved ${pieces.length} to ${CASES.find((c) => c.id === caseId)?.name}`;
    });
  }

  function bulkArchive() {
    if (!confirm(`Archive ${selected.size} pieces? They will be hidden from the public catalog.`))
      return;
    return runBulk(async () => {
      const { error: err } = await supabase
        .from('pottery')
        .update({ status: 'Archived' })
        .in('id', [...selected]);
      if (err) throw err;
      return `Archived ${selected.size} pieces`;
    });
  }

  function bulkAnalyze() {
    const pieces = chosen().filter((p) => p.photos?.length);
    void (async () => {
      for (const p of pieces) await analyzeInBackground(supabase, p.id, p.photos);
    })();
    toast.info(`Analyzing ${pieces.length} pieces in the background — results appear in Review`);
    endBulk();
  }

  return (
    <>
      <AppHeader user={user} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-nav pt-6 sm:px-6 sm:pb-16 sm:pt-10">
        {showHero && <CatalogHero stats={stats} onRegion={(region) => setParams({ region })} />}

        <div className="sticky top-14 z-10 -mx-4 mb-3 bg-canvas/90 px-4 py-2 backdrop-blur sm:top-16 sm:mx-0 sm:px-0">
          <div className="flex gap-2">
            <label className="relative flex-1">
              <span className="sr-only">Search the collection</span>
              <Icon
                name="search"
                size={16}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-faint"
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, culture, SKU, description…"
                className={`${inputClass} pl-10`}
              />
            </label>
            <Button
              variant={filterCount ? 'primary' : 'secondary'}
              onClick={() => setFiltersOpen(true)}
              aria-label={`Filters${filterCount ? ` (${filterCount} active)` : ''}`}
            >
              <Icon name="filter" size={16} />
              <span className="hidden sm:inline">Filters</span>
              {filterCount > 0 && <span className="text-xs">{filterCount}</span>}
            </Button>
          </div>

          <div className="mt-2 flex items-center gap-2">
            <div
              role="tablist"
              aria-label="View"
              className="-mx-1 flex flex-1 gap-1 overflow-x-auto px-1"
            >
              {VIEW_MODES.map((v) => (
                <button
                  key={v.value}
                  type="button"
                  role="tab"
                  aria-selected={params.view === v.value}
                  onClick={() => setParams({ view: v.value })}
                  className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${params.view === v.value ? 'bg-ink text-white' : 'text-muted hover:bg-sunken hover:text-ink'}`}
                >
                  <Icon name={VIEW_ICONS[v.value]} size={14} />
                  {v.label}
                </button>
              ))}
            </div>
            {params.view === 'grid' && (
              <select
                aria-label="Sort"
                value={params.sort}
                onChange={(e) => setParams({ sort: e.target.value as SortKey })}
                className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        <ActiveFilters params={params} onChange={setParams} onClear={clearFilters} />

        {error ? (
          <EmptyState
            icon="alert"
            title="Something went wrong"
            body={error}
            action={
              <Button variant="secondary" onClick={() => loadPage(0)}>
                Try again
              </Button>
            }
          />
        ) : params.view === 'grid' ? (
          <>
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-xs text-muted" aria-live="polite">
                {count == null
                  ? 'Loading…'
                  : `${count.toLocaleString()} ${count === 1 ? 'piece' : 'pieces'}${params.archived ? ' (archived)' : ''}`}
              </p>
              {staff && (
                <Button
                  size="sm"
                  variant={selecting ? 'primary' : 'ghost'}
                  onClick={() => (selecting ? endBulk() : setSelecting(true))}
                >
                  {selecting ? 'Cancel selection' : 'Select'}
                </Button>
              )}
            </div>
            {loading && items.length === 0 ? (
              <CardGridSkeleton />
            ) : items.length === 0 ? (
              <EmptyState
                title="No pieces found"
                body={
                  filterCount || params.q
                    ? 'Try removing a filter or searching for something else.'
                    : 'The collection is empty.'
                }
                action={
                  filterCount || params.q ? (
                    <Button variant="secondary" onClick={clearFilters}>
                      Clear filters
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
                {items.map((item) => (
                  <PieceCard
                    key={item.id}
                    item={item}
                    showReview={staff}
                    selectable={selecting}
                    selected={selected.has(item.id)}
                    onToggle={toggleSelected}
                  />
                ))}
              </div>
            )}
            {hasMore && (
              <div ref={sentinel} className="mt-8 flex justify-center">
                <Button variant="secondary" loading={loading} onClick={() => loadPage(page + 1)}>
                  Load {Math.min(PAGE_SIZE, (count as number) - items.length)} more
                </Button>
              </div>
            )}
          </>
        ) : all?.key !== dataKey ? (
          <ViewLoading />
        ) : params.view === 'map' ? (
          <InventoryMap items={all.items} />
        ) : params.view === 'timeline' ? (
          <InventoryTimeline items={all.items} />
        ) : params.view === 'tree' ? (
          <InventoryTree items={all.items} />
        ) : (
          <InventoryCase items={all.items} />
        )}
      </main>

      <FilterSheet
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        params={params}
        onChange={setParams}
        onClear={clearFilters}
        staff={staff}
        resultCount={params.view === 'grid' ? count : null}
      />
      {selecting && (
        <BulkBar
          count={selected.size}
          busy={bulkBusy}
          onMove={bulkMove}
          onArchive={bulkArchive}
          onAnalyze={bulkAnalyze}
          onCancel={endBulk}
        />
      )}
      <BottomNav staff={staff} />
    </>
  );
}
