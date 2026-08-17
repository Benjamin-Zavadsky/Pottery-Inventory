'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import type { PotteryItem } from '@/lib/types';
import BottomNav from '@/components/BottomNav';
import type { User } from '@supabase/supabase-js';

type ViewMode = 'grid' | 'map' | 'tree' | 'case';

const InventoryMap = dynamic(() => import('@/components/InventoryMap'), {
  ssr: false,
  loading: () => (
    <div
      className="w-full bg-[#f3f3f3] rounded-2xl flex items-center justify-center text-sm text-[#aaa]"
      style={{ height: 'calc(100vh - 260px)', minHeight: 400 }}
    >
      Loading map…
    </div>
  ),
});
const InventoryTree = dynamic(() => import('@/components/InventoryTree'), {
  ssr: false,
  loading: () => (
    <div
      className="w-full bg-[#f3f3f3] rounded-2xl flex items-center justify-center text-sm text-[#aaa]"
      style={{ height: 'calc(100vh - 260px)', minHeight: 400 }}
    >
      Loading tree…
    </div>
  ),
});
const InventoryCase = dynamic(() => import('@/components/InventoryCase'), {
  ssr: false,
  loading: () => (
    <div
      className="w-full bg-[#f3f3f3] rounded-2xl flex items-center justify-center text-sm text-[#aaa]"
      style={{ height: 'calc(100vh - 260px)', minHeight: 400 }}
    >
      Loading cases…
    </div>
  ),
});
const PieceModal = dynamic(() => import('@/components/PieceModal'), { ssr: false });

const CONDITIONS = ['Mint', 'Excellent', 'Good', 'Fair', 'Poor'];
const RARITIES = ['Common', 'Uncommon', 'Rare', 'Museum-Grade'];
const ORIGINALITIES = ['Authenticated Original', 'Suspected Original', 'Reproduction', 'Unknown'];

type Filters = {
  condition: string;
  rarity: string;
  originality: string;
  place_of_origin: string;
  color: string;
  use_function: string;
  tribe_culture: string;
  location_acquired: string;
  location_in_case: string;
  seller_donator: string;
  age: string;
};

const EMPTY_FILTERS: Filters = {
  condition: '',
  rarity: '',
  originality: '',
  place_of_origin: '',
  color: '',
  use_function: '',
  tribe_culture: '',
  location_acquired: '',
  location_in_case: '',
  seller_donator: '',
  age: '',
};

export default function HomePage() {
  const [items, setItems] = useState<PotteryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest');
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [dynamicOptions, setDynamicOptions] = useState<Record<string, string[]>>({});
  const [user, setUser] = useState<User | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [modalItem, setModalItem] = useState<PotteryItem | null>(null);
  const supabase = useMemo(() => createClient(), []);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('pottery')
      .select('*')
      .eq('status', 'Active')
      .order('created_at', { ascending: sort === 'oldest' });

    if (filters.condition) query = query.eq('condition', filters.condition);
    if (filters.rarity) query = query.eq('rarity', filters.rarity);
    if (filters.originality) query = query.eq('originality', filters.originality);
    if (filters.place_of_origin) query = query.eq('place_of_origin', filters.place_of_origin);
    if (filters.color) query = query.ilike('color', `%${filters.color}%`);
    if (filters.use_function) query = query.ilike('use_function', `%${filters.use_function}%`);
    if (filters.tribe_culture) query = query.eq('tribe_culture', filters.tribe_culture);
    if (filters.location_acquired) query = query.eq('location_acquired', filters.location_acquired);
    if (filters.location_in_case) query = query.eq('location_in_case', filters.location_in_case);
    if (filters.seller_donator) query = query.eq('seller_donator', filters.seller_donator);
    if (filters.age) query = query.ilike('age', `%${filters.age}%`);

    const { data } = await query;
    setItems(data ?? []);
    setLoading(false);
  }, [sort, filters, supabase]);

  const fetchDynamicOptions = useCallback(async () => {
    const { data } = await supabase
      .from('pottery')
      .select(
        'place_of_origin, color, use_function, tribe_culture, location_acquired, location_in_case, seller_donator, age',
      )
      .eq('status', 'Active');
    if (!data) return;
    const unique = (field: keyof (typeof data)[0]) =>
      [...new Set(data.map((r) => r[field]).filter(Boolean))].sort() as string[];
    setDynamicOptions({
      place_of_origin: unique('place_of_origin'),
      color: unique('color'),
      use_function: unique('use_function'),
      tribe_culture: unique('tribe_culture'),
      location_acquired: unique('location_acquired'),
      location_in_case: unique('location_in_case'),
      seller_donator: unique('seller_donator'),
      age: unique('age'),
    });
  }, [supabase]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional fetch-on-mount/filter-change
    fetchItems();
  }, [fetchItems]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional fetch-on-mount
    fetchDynamicOptions();
  }, [fetchDynamicOptions]);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, [supabase]);

  function setFilter(key: keyof Filters, value: string) {
    setFilters((f) => ({ ...f, [key]: value }));
  }

  function clearFilters() {
    setFilters(EMPTY_FILTERS);
  }

  function openAdd() {
    setModalMode('add');
    setModalItem(null);
    setModalOpen(true);
  }
  function openEdit(item: PotteryItem) {
    setModalMode('edit');
    setModalItem(item);
    setModalOpen(true);
  }
  function handleSaved(updated: PotteryItem) {
    setItems((prev) =>
      prev.some((i) => i.id === updated.id)
        ? prev.map((i) => (i.id === updated.id ? updated : i))
        : [updated, ...prev],
    );
    setModalOpen(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = '/login';
  }

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const filtered = items.filter((item) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      item.name.toLowerCase().includes(q) ||
      item.sku.toLowerCase().includes(q) ||
      item.place_of_origin.toLowerCase().includes(q) ||
      item.color.toLowerCase().includes(q) ||
      (item.tribe_culture ?? '').toLowerCase().includes(q) ||
      (item.use_function ?? '').toLowerCase().includes(q) ||
      (item.seller_donator ?? '').toLowerCase().includes(q) ||
      (item.age ?? '').toLowerCase().includes(q)
    );
  });

  const filterContent = (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      <FilterSelect
        label="Condition"
        value={filters.condition}
        onChange={(v) => setFilter('condition', v)}
        options={CONDITIONS}
      />
      <FilterSelect
        label="Rarity"
        value={filters.rarity}
        onChange={(v) => setFilter('rarity', v)}
        options={RARITIES}
      />
      <FilterSelect
        label="Originality"
        value={filters.originality}
        onChange={(v) => setFilter('originality', v)}
        options={ORIGINALITIES}
      />
      <FilterSelect
        label="Place of Origin"
        value={filters.place_of_origin}
        onChange={(v) => setFilter('place_of_origin', v)}
        options={dynamicOptions.place_of_origin ?? []}
      />
      <FilterSelect
        label="Color"
        value={filters.color}
        onChange={(v) => setFilter('color', v)}
        options={dynamicOptions.color ?? []}
      />
      <FilterSelect
        label="Use / Function"
        value={filters.use_function}
        onChange={(v) => setFilter('use_function', v)}
        options={dynamicOptions.use_function ?? []}
      />
      <FilterSelect
        label="Tribe / Culture"
        value={filters.tribe_culture}
        onChange={(v) => setFilter('tribe_culture', v)}
        options={dynamicOptions.tribe_culture ?? []}
      />
      <FilterSelect
        label="Age / Period"
        value={filters.age}
        onChange={(v) => setFilter('age', v)}
        options={dynamicOptions.age ?? []}
      />
      <FilterSelect
        label="Location Acquired"
        value={filters.location_acquired}
        onChange={(v) => setFilter('location_acquired', v)}
        options={dynamicOptions.location_acquired ?? []}
      />
      <FilterSelect
        label="Location in Case"
        value={filters.location_in_case}
        onChange={(v) => setFilter('location_in_case', v)}
        options={dynamicOptions.location_in_case ?? []}
      />
      <FilterSelect
        label="Seller / Donator"
        value={filters.seller_donator}
        onChange={(v) => setFilter('seller_donator', v)}
        options={dynamicOptions.seller_donator ?? []}
      />
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-[#e5e5e5] px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between sticky top-0 z-10">
        <h1 className="text-sm sm:text-lg font-light tracking-widest uppercase">
          Pottery Collection
        </h1>
        <div className="flex items-center gap-3 sm:gap-4">
          {user ? (
            <>
              <Link
                href="/add"
                className="hidden sm:flex items-center bg-[#111] text-white text-sm px-4 py-2 rounded-lg hover:bg-[#333] transition-colors"
              >
                + Add Piece
              </Link>
              <button
                onClick={handleLogout}
                className="text-[#6b6b6b] hover:text-[#111] transition-colors"
              >
                <span className="hidden sm:inline text-sm">Sign Out</span>
                <svg
                  className="sm:hidden w-5 h-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="text-sm text-[#6b6b6b] hover:text-[#111] transition-colors"
            >
              Sign In
            </Link>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-4 sm:py-8 pb-nav sm:pb-8">
        {/* View toggle */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex gap-0.5 bg-[#f3f3f3] p-1 rounded-xl">
            {(['grid', 'map', 'tree', 'case'] as ViewMode[]).map((v) => (
              <button
                key={v}
                onClick={() => setViewMode(v)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${viewMode === v ? 'bg-white text-[#111] shadow-sm' : 'text-[#6b6b6b] hover:text-[#111]'}`}
              >
                {v === 'grid' ? 'Grid' : v === 'map' ? 'Map' : v === 'tree' ? 'Tree' : 'Cases'}
              </button>
            ))}
          </div>
        </div>

        {/* Search + Filter row — grid only */}
        {viewMode === 'grid' && (
          <div className="flex gap-2 sm:gap-3 mb-3">
            <input
              type="search"
              placeholder="Search name, SKU, origin, color..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 border border-[#e5e5e5] rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:border-[#111] transition-colors"
            />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as 'newest' | 'oldest')}
              className="hidden sm:block border border-[#e5e5e5] rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-[#111] transition-colors"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
            <button
              onClick={() => setShowFilters((f) => !f)}
              className={`flex items-center gap-1.5 border rounded-xl px-3 py-2.5 text-sm transition-colors whitespace-nowrap ${showFilters ? 'bg-[#111] text-white border-[#111]' : 'bg-white border-[#e5e5e5]'}`}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <line x1="4" y1="6" x2="20" y2="6" />
                <line x1="8" y1="12" x2="16" y2="12" />
                <line x1="11" y1="18" x2="13" y2="18" />
              </svg>
              <span className="hidden sm:inline">Filters</span>
              {activeFilterCount > 0 && (
                <span
                  className={`text-xs rounded-full w-4 h-4 flex items-center justify-center font-semibold ${showFilters ? 'bg-white text-[#111]' : 'bg-[#111] text-white'}`}
                >
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        )}

        {/* Mobile: sort pills — grid only */}
        {viewMode === 'grid' && (
          <div className="flex gap-2 mb-4 sm:hidden">
            {(['newest', 'oldest'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSort(s)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${sort === s ? 'bg-[#111] text-white border-[#111]' : 'bg-white text-[#6b6b6b] border-[#e5e5e5]'}`}
              >
                {s === 'newest' ? 'Newest first' : 'Oldest first'}
              </button>
            ))}
            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="text-xs px-3 py-1.5 rounded-full border border-[#e5e5e5] bg-white text-[#6b6b6b]"
              >
                Clear filters
              </button>
            )}
          </div>
        )}

        {/* Desktop: inline filter panel — grid only */}
        {viewMode === 'grid' && showFilters && (
          <div className="hidden sm:block bg-white border border-[#e5e5e5] rounded-2xl p-5 mb-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-[#6b6b6b] uppercase tracking-wider">Filter by</p>
              {activeFilterCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-[#6b6b6b] hover:text-[#111] transition-colors underline underline-offset-2"
                >
                  Clear all
                </button>
              )}
            </div>
            {filterContent}
          </div>
        )}

        {/* Mobile: filter bottom sheet — grid only */}
        {viewMode === 'grid' && showFilters && (
          <div className="sm:hidden fixed inset-0 z-30 flex flex-col justify-end">
            <div className="absolute inset-0 bg-black/40" onClick={() => setShowFilters(false)} />
            <div className="relative bg-white rounded-t-3xl flex flex-col max-h-[82vh]">
              <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[#e5e5e5]">
                <span className="text-sm font-medium tracking-wide">Filter by</span>
                <button
                  onClick={() => setShowFilters(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-[#f3f3f3] text-[#6b6b6b] text-lg"
                >
                  ×
                </button>
              </div>
              <div className="overflow-y-auto flex-1 px-5 py-4">{filterContent}</div>
              <div
                className="px-5 pt-3 pb-4 border-t border-[#e5e5e5] flex flex-col gap-2"
                style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
              >
                {activeFilterCount > 0 && (
                  <button onClick={clearFilters} className="w-full text-sm text-[#6b6b6b] py-2">
                    Clear all filters
                  </button>
                )}
                <button
                  onClick={() => setShowFilters(false)}
                  className="w-full bg-[#111] text-white rounded-xl py-3 text-sm font-medium"
                >
                  {activeFilterCount > 0 ? `Show results (${filtered.length})` : 'Done'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Grid */}
        {viewMode === 'grid' &&
          (loading ? (
            <div className="text-center text-[#6b6b6b] py-20 text-sm">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center py-20 gap-3">
              <svg
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#ccc"
                strokeWidth="1.5"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <p className="text-sm text-[#6b6b6b]">No pieces found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
              {filtered.map((item, i) => (
                <PotteryCard
                  key={item.id}
                  item={item}
                  isRecent={i < 3 && sort === 'newest' && !search && activeFilterCount === 0}
                />
              ))}
            </div>
          ))}

        {/* Map */}
        {viewMode === 'map' && !loading && <InventoryMap items={items} onEditPiece={openEdit} />}

        {/* Tree */}
        {viewMode === 'tree' && !loading && <InventoryTree items={items} onEditPiece={openEdit} />}

        {/* Cases */}
        {viewMode === 'case' && !loading && <InventoryCase items={items} onEditPiece={openEdit} />}
      </main>

      {/* Quick edit modal */}
      {modalOpen && (
        <PieceModal
          mode={modalMode}
          item={modalItem ?? undefined}
          onClose={() => setModalOpen(false)}
          onSaved={handleSaved}
        />
      )}

      <BottomNav />
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-[#aaa] uppercase tracking-wider">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#111] transition-colors ${value ? 'border-[#111]' : 'border-[#e5e5e5]'}`}
      >
        <option value="">All</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

function PotteryCard({ item, isRecent }: { item: PotteryItem; isRecent?: boolean }) {
  const photo = item.photos?.[0];
  return (
    <Link href={`/item/${item.id}`}>
      <div className="bg-white border border-[#e5e5e5] rounded-2xl overflow-hidden hover:border-[#aaa] hover:shadow-sm transition-all cursor-pointer group relative">
        {isRecent && (
          <span className="absolute top-2 left-2 z-10 bg-[#111] text-white text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full">
            New
          </span>
        )}
        <div className="aspect-square bg-[#f3f3f3] flex items-center justify-center overflow-hidden">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photo}
              alt={item.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#ccc"
              strokeWidth="1.5"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          )}
        </div>
        <div className="p-3 sm:p-4">
          <div className="flex items-start justify-between gap-1 mb-1.5">
            <h2 className="text-xs sm:text-sm font-medium leading-snug line-clamp-2">
              {item.name}
            </h2>
            <span className="text-[10px] sm:text-xs text-[#6b6b6b] whitespace-nowrap font-mono shrink-0">
              {item.sku}
            </span>
          </div>
          <p className="text-[10px] sm:text-xs text-[#6b6b6b]">
            <span className="text-[#bbb]">Origin: </span>
            {item.place_of_origin}
          </p>
          {item.age && (
            <p className="text-[10px] sm:text-xs text-[#6b6b6b]">
              <span className="text-[#bbb]">Age: </span>
              {item.age}
            </p>
          )}
          {item.condition && (
            <p className="text-[10px] sm:text-xs text-[#6b6b6b] hidden sm:block">
              <span className="text-[#bbb]">Condition: </span>
              {item.condition}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
