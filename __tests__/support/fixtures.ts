import type { PieceSummary, PotteryItem } from '@/lib/types';

export const STORAGE = 'https://test-project.supabase.co/storage/v1/object/public/pottery-photos';

export function makeItem(overrides: Partial<PotteryItem> = {}): PotteryItem {
  return {
    id: 'id-1',
    sku: 'P0001',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    name: 'Ramey Incised Jar',
    description: null,
    place_of_origin: 'Cahokia, Illinois',
    age: '1050–1200 CE',
    color: 'Buff',
    use_function: null,
    tribe_culture: 'Mississippian',
    culture_id: 'mississippian',
    region: 'North America',
    period_start_year: 1050,
    period_end_year: 1200,
    dimensions: null,
    condition: 'Good',
    rarity: null,
    originality: null,
    location_in_case: null,
    case_id: null,
    status: 'Active',
    date_acquired: null,
    location_acquired: null,
    provenance: null,
    museums_comparable: null,
    research_notes: null,
    photos: [`${STORAGE}/P0001/a.jpg`],
    thumbs: [`${STORAGE}/P0001/thumbs/a.jpg`],
    ai_fields: [],
    ...overrides,
  };
}

export function makeSummary(overrides: Partial<PieceSummary> = {}): PieceSummary {
  const {
    id,
    sku,
    name,
    age,
    tribe_culture,
    culture_id,
    region,
    period_start_year,
    period_end_year,
    case_id,
    condition,
    status,
    photos,
    thumbs,
    ai_fields,
    created_at,
  } = makeItem(overrides as Partial<PotteryItem>);
  return {
    id,
    sku,
    name,
    age,
    tribe_culture,
    culture_id,
    region,
    period_start_year,
    period_end_year,
    case_id,
    condition,
    status,
    photos,
    thumbs,
    ai_fields,
    created_at,
  };
}
