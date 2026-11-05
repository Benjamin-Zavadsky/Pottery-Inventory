import { z } from 'zod';
import {
  CONDITIONS,
  CULTURE_BY_ID,
  ORIGINALITIES,
  RARITIES,
  REGIONS,
  type Region,
} from './constants';
import { formatYear } from './period';

export const AI_MODEL = 'claude-opus-4-7';
export const CONFIDENCE = ['High', 'Medium', 'Low'] as const;

const text = z
  .string()
  .trim()
  .transform((s) => s || null)
  .nullable()
  .catch(null);
const year = z.number().int().min(-20000).max(2100).nullable().catch(null);

const AI_RESULT = z.object({
  description: text,
  name: text,
  place_of_origin: text,
  age: text,
  color: text,
  use_function: text,
  tribe_culture: text,
  dimensions: text,
  condition: z.enum(CONDITIONS).nullable().catch(null),
  rarity: z.enum(RARITIES).nullable().catch(null),
  originality: z.enum(ORIGINALITIES).nullable().catch(null),
  culture_id: z
    .string()
    .refine((id) => id in CULTURE_BY_ID)
    .nullable()
    .catch(null),
  region: z
    .enum(REGIONS as [Region, ...Region[]])
    .nullable()
    .catch(null),
  period_start_year: year,
  period_end_year: year,
  confidence: z.enum(CONFIDENCE).nullable().catch(null),
});

export type AiSuggestions = z.infer<typeof AI_RESULT>;
export type AiResult = AiSuggestions & { model: string };
export type SuggestionKey = Exclude<keyof AiSuggestions, 'confidence'>;

export function normalizeAiResult(raw: unknown): AiSuggestions {
  const result = AI_RESULT.parse(raw && typeof raw === 'object' ? raw : {});
  if (result.culture_id && !result.region) result.region = CULTURE_BY_ID[result.culture_id].region;
  const { period_start_year: s, period_end_year: e } = result;
  if (s != null && e != null && s > e) {
    result.period_start_year = e;
    result.period_end_year = s;
  }
  return result;
}

export const SUGGESTION_FIELDS: { key: SuggestionKey; label: string }[] = [
  { key: 'name', label: 'Name' },
  { key: 'culture_id', label: 'Culture' },
  { key: 'region', label: 'Region' },
  { key: 'period_start_year', label: 'Period start' },
  { key: 'period_end_year', label: 'Period end' },
  { key: 'age', label: 'Age / Period' },
  { key: 'place_of_origin', label: 'Place of Origin' },
  { key: 'tribe_culture', label: 'Tribe / Culture (detail)' },
  { key: 'use_function', label: 'Use / Function' },
  { key: 'color', label: 'Color' },
  { key: 'dimensions', label: 'Dimensions (estimate)' },
  { key: 'condition', label: 'Condition' },
  { key: 'rarity', label: 'Rarity' },
  { key: 'originality', label: 'Originality' },
  { key: 'description', label: 'Description' },
];

export type SuggestionValue = string | number;

export function suggestionEntries(s: AiSuggestions) {
  return SUGGESTION_FIELDS.filter(({ key }) => s[key] != null).map(({ key, label }) => ({
    key,
    label,
    value: s[key] as SuggestionValue,
  }));
}

export function formatSuggestion(key: SuggestionKey, value: SuggestionValue | null | undefined) {
  if (value == null || value === '') return '—';
  if (key === 'culture_id') return CULTURE_BY_ID[String(value)]?.culture ?? String(value);
  if (key === 'period_start_year' || key === 'period_end_year') return formatYear(Number(value));
  return String(value);
}
