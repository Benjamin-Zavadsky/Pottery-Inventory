import { matchCulture } from './taxonomy';
import { parseAgeRange } from './period';
import { needsThumbs } from './photos';
import { CULTURE_BY_ID } from './constants';
import type { PotteryItem } from './types';

export const DASHBOARD_COLUMNS =
  'id, sku, name, photos, thumbs, dimensions, provenance, culture_id, tribe_culture, place_of_origin, region, period_start_year, period_end_year, age, case_id, ai_fields';

export type DashboardRow = Pick<
  PotteryItem,
  | 'id'
  | 'sku'
  | 'name'
  | 'photos'
  | 'thumbs'
  | 'dimensions'
  | 'provenance'
  | 'culture_id'
  | 'tribe_culture'
  | 'place_of_origin'
  | 'region'
  | 'period_start_year'
  | 'period_end_year'
  | 'age'
  | 'case_id'
  | 'ai_fields'
>;

// Derives structured taxonomy for legacy free-text records. Only fills
// fields that are empty — never overwrites a value staff already set.
export function classificationFor(row: DashboardRow): Partial<PotteryItem> | null {
  const patch: Partial<PotteryItem> = {};
  if (!row.culture_id) {
    const culture =
      matchCulture(row.tribe_culture) ??
      matchCulture(row.place_of_origin) ??
      matchCulture(row.name);
    if (culture) {
      patch.culture_id = culture.id;
      if (!row.region) patch.region = culture.region;
    }
  } else if (!row.region) {
    patch.region = CULTURE_BY_ID[row.culture_id]?.region ?? null;
  }
  if (row.period_start_year == null && row.period_end_year == null) {
    const period = parseAgeRange(row.age);
    if (period) {
      patch.period_start_year = period.start;
      patch.period_end_year = period.end;
    }
  }
  return Object.keys(patch).length ? patch : null;
}

export function dashboardStats(rows: DashboardRow[]) {
  return {
    total: rows.length,
    flagged: rows.filter((r) => r.ai_fields?.length).length,
    unassigned: rows.filter((r) => !r.case_id).length,
    unclassified: rows.filter((r) => !r.culture_id).length,
    undated: rows.filter((r) => r.period_start_year == null && r.period_end_year == null).length,
    noPhotos: rows.filter((r) => !r.photos?.length).length,
    noDimensions: rows.filter((r) => !r.dimensions).length,
    noProvenance: rows.filter((r) => !r.provenance).length,
    needThumbs: rows.filter(needsThumbs).length,
    classifiable: rows.filter((r) => classificationFor(r)).length,
  };
}

export const EXPORT_COLUMNS = [
  'sku',
  'status',
  'name',
  'culture_id',
  'region',
  'period_start_year',
  'period_end_year',
  'age',
  'place_of_origin',
  'tribe_culture',
  'use_function',
  'color',
  'dimensions',
  'condition',
  'rarity',
  'originality',
  'case_id',
  'date_acquired',
  'location_acquired',
  'provenance',
  'museums_comparable',
  'seller_donator',
  'acquisition_cost',
  'appraised_value',
  'appraisal_date',
  'appraiser_name',
  'description',
  'research_notes',
  'ai_fields',
  'photos',
  'created_at',
  'updated_at',
];
