import type { CONDITIONS, RARITIES, ORIGINALITIES, Region } from './constants';

export type Condition = (typeof CONDITIONS)[number];
export type Rarity = (typeof RARITIES)[number];
export type Originality = (typeof ORIGINALITIES)[number];
export type Status = 'Active' | 'Archived' | 'Deaccessioned';

export interface PotteryItem {
  id: string;
  sku: string;
  created_at: string;
  updated_at: string;
  name: string;
  description: string | null;
  place_of_origin: string | null;
  age: string | null;
  color: string | null;
  use_function: string | null;
  tribe_culture: string | null;
  culture_id: string | null;
  region: Region | null;
  period_start_year: number | null;
  period_end_year: number | null;
  dimensions: string | null;
  condition: Condition | null;
  rarity: Rarity | null;
  originality: Originality | null;
  location_in_case: string | null;
  case_id: string | null;
  status: Status;
  date_acquired: string | null;
  location_acquired: string | null;
  provenance: string | null;
  museums_comparable: string | null;
  research_notes: string | null;
  photos: string[];
  thumbs: string[];
  ai_fields: string[];
}

export interface PotteryPrivate {
  pottery_id: string;
  acquisition_cost: number | null;
  appraised_value: number | null;
  appraisal_date: string | null;
  appraiser_name: string | null;
  seller_donator: string | null;
}

export const SUMMARY_COLUMNS =
  'id, sku, name, age, tribe_culture, culture_id, region, period_start_year, period_end_year, case_id, condition, status, photos, thumbs, ai_fields, created_at';

export const STATS_COLUMNS =
  'culture_id, tribe_culture, region, period_start_year, period_end_year';

export type PieceSummary = Pick<
  PotteryItem,
  | 'id'
  | 'sku'
  | 'name'
  | 'age'
  | 'tribe_culture'
  | 'culture_id'
  | 'region'
  | 'period_start_year'
  | 'period_end_year'
  | 'case_id'
  | 'condition'
  | 'status'
  | 'photos'
  | 'thumbs'
  | 'ai_fields'
  | 'created_at'
>;

export interface Case {
  id: string;
  name: string;
  description: string | null;
  capacity: number | null;
  last_inventoried_at: string | null;
}

export interface LocationHistory {
  id: string;
  pottery_id: string;
  from_case: string | null;
  to_case: string;
  moved_at: string;
  moved_by: string | null;
  notes: string | null;
}

export interface Revision {
  id: number;
  table_name: string;
  record_id: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  changed_at: string;
  changed_by: string | null;
  old_row: Record<string, unknown> | null;
  new_row: Record<string, unknown> | null;
}

export interface AiAnalysisRow {
  id: string;
  pottery_id: string | null;
  created_at: string;
  model: string;
  photo_urls: string[];
  user_context: string | null;
  result: Record<string, unknown>;
  status: 'pending' | 'applied' | 'dismissed';
}
