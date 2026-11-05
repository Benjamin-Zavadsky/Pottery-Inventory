import {
  CASE_IDS,
  CONDITIONS,
  CULTURE_BY_ID,
  ORIGINALITIES,
  RARITIES,
  REGIONS,
  type Region,
} from './constants';
import type { SuggestionKey, SuggestionValue } from './ai';
import type { PotteryItem, PotteryPrivate } from './types';

export type PieceFormValues = {
  name: string;
  culture_id: string;
  region: string;
  period_start_year: number | null;
  period_end_year: number | null;
  age: string;
  place_of_origin: string;
  tribe_culture: string;
  color: string;
  use_function: string;
  dimensions: string;
  condition: string;
  rarity: string;
  originality: string;
  case_id: string;
  date_acquired: string;
  location_acquired: string;
  provenance: string;
  museums_comparable: string;
  research_notes: string;
  description: string;
};

export type FormKey = keyof PieceFormValues;

export const EMPTY_FORM: PieceFormValues = {
  name: '',
  culture_id: '',
  region: '',
  period_start_year: null,
  period_end_year: null,
  age: '',
  place_of_origin: '',
  tribe_culture: '',
  color: '',
  use_function: '',
  dimensions: '',
  condition: '',
  rarity: '',
  originality: '',
  case_id: '',
  date_acquired: '',
  location_acquired: '',
  provenance: '',
  museums_comparable: '',
  research_notes: '',
  description: '',
};

export type PrivateFormValues = {
  acquisition_cost: string;
  appraised_value: string;
  appraisal_date: string;
  appraiser_name: string;
  seller_donator: string;
};

export const EMPTY_PRIVATE: PrivateFormValues = {
  acquisition_cost: '',
  appraised_value: '',
  appraisal_date: '',
  appraiser_name: '',
  seller_donator: '',
};

export function formFromItem(item: PotteryItem): PieceFormValues {
  const form = { ...EMPTY_FORM };
  for (const key of Object.keys(EMPTY_FORM) as FormKey[]) {
    const value = item[key];
    if (key === 'period_start_year' || key === 'period_end_year')
      form[key] = (value as number) ?? null;
    else form[key] = (value as string | null) ?? '';
  }
  return form;
}

function allowed<T extends string>(value: string, list: readonly T[]): T | null {
  return (list as readonly string[]).includes(value) ? (value as T) : null;
}

export function formToRow(form: PieceFormValues) {
  const text = (v: string) => v.trim() || null;
  const culture = CULTURE_BY_ID[form.culture_id];
  return {
    name: form.name.trim(),
    culture_id: culture ? culture.id : null,
    region: allowed<Region>(form.region, REGIONS) ?? culture?.region ?? null,
    period_start_year: form.period_start_year,
    period_end_year: form.period_end_year,
    age: text(form.age),
    place_of_origin: text(form.place_of_origin),
    tribe_culture: text(form.tribe_culture),
    color: text(form.color),
    use_function: text(form.use_function),
    dimensions: text(form.dimensions),
    condition: allowed(form.condition, CONDITIONS),
    rarity: allowed(form.rarity, RARITIES),
    originality: allowed(form.originality, ORIGINALITIES),
    case_id: allowed(form.case_id, CASE_IDS),
    date_acquired: form.date_acquired || null,
    location_acquired: text(form.location_acquired),
    provenance: text(form.provenance),
    museums_comparable: text(form.museums_comparable),
    research_notes: text(form.research_notes),
    description: text(form.description),
  } satisfies Partial<PotteryItem>;
}

export function validateForm(form: PieceFormValues): string | null {
  if (!form.name.trim()) return 'Name is required';
  const { period_start_year: s, period_end_year: e } = form;
  if (s != null && e != null && s > e) return 'Period start must be before period end';
  return null;
}

export function applySuggestion(
  form: PieceFormValues,
  key: SuggestionKey,
  value: SuggestionValue,
): PieceFormValues {
  const next = { ...form, [key]: value };
  if (key === 'culture_id' && !form.region)
    next.region = CULTURE_BY_ID[String(value)]?.region ?? '';
  return next;
}

export function privateFromRow(row: PotteryPrivate | null): PrivateFormValues {
  if (!row) return { ...EMPTY_PRIVATE };
  const str = (v: unknown) => (v == null ? '' : String(v));
  return {
    acquisition_cost: str(row.acquisition_cost),
    appraised_value: str(row.appraised_value),
    appraisal_date: str(row.appraisal_date),
    appraiser_name: str(row.appraiser_name),
    seller_donator: str(row.seller_donator),
  };
}

export function privateToRow(potteryId: string, form: PrivateFormValues): PotteryPrivate {
  const money = (v: string) => {
    const n = Number.parseFloat(v);
    return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
  };
  return {
    pottery_id: potteryId,
    acquisition_cost: money(form.acquisition_cost),
    appraised_value: money(form.appraised_value),
    appraisal_date: form.appraisal_date || null,
    appraiser_name: form.appraiser_name.trim() || null,
    seller_donator: form.seller_donator.trim() || null,
  };
}

export function hasPrivateValues(form: PrivateFormValues): boolean {
  return Object.values(form).some((v) => v.trim() !== '');
}
