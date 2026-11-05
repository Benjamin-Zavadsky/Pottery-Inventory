import {
  CONDITIONS,
  ORIGINALITIES,
  RARITIES,
  REGIONS,
  CULTURE_BY_ID,
  type Region,
} from './constants';

export type SortKey = 'newest' | 'oldest' | 'age-asc' | 'age-desc' | 'sku';
export type ViewMode = 'grid' | 'map' | 'timeline' | 'tree' | 'case';

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'newest', label: 'Recently added' },
  { value: 'oldest', label: 'First added' },
  { value: 'age-asc', label: 'Artifact age: oldest' },
  { value: 'age-desc', label: 'Artifact age: newest' },
  { value: 'sku', label: 'SKU' },
];

export const VIEW_MODES: { value: ViewMode; label: string }[] = [
  { value: 'grid', label: 'Grid' },
  { value: 'map', label: 'Map' },
  { value: 'timeline', label: 'Timeline' },
  { value: 'tree', label: 'Cultures' },
  { value: 'case', label: 'Cases' },
];

export interface CatalogParams {
  q: string;
  region: Region | '';
  culture: string;
  condition: string;
  rarity: string;
  originality: string;
  caseId: string;
  from: number | null;
  to: number | null;
  sort: SortKey;
  view: ViewMode;
  archived: boolean;
  review: boolean;
}

export const DEFAULT_PARAMS: CatalogParams = {
  q: '',
  region: '',
  culture: '',
  condition: '',
  rarity: '',
  originality: '',
  caseId: '',
  from: null,
  to: null,
  sort: 'newest',
  view: 'grid',
  archived: false,
  review: false,
};

function oneOf<T extends string>(value: string | null, allowed: readonly T[]): T | '' {
  return value && (allowed as readonly string[]).includes(value) ? (value as T) : '';
}

function year(value: string | null): number | null {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isInteger(n) ? n : null;
}

export function parseCatalogParams(sp: URLSearchParams): CatalogParams {
  const unassigned = sp.get('unassigned') === '1';
  return {
    q: sp.get('q') ?? '',
    region: oneOf(sp.get('region'), REGIONS),
    culture: CULTURE_BY_ID[sp.get('culture') ?? ''] ? (sp.get('culture') as string) : '',
    condition: oneOf(sp.get('condition'), CONDITIONS),
    rarity: oneOf(sp.get('rarity'), RARITIES),
    originality: oneOf(sp.get('originality'), ORIGINALITIES),
    caseId: unassigned ? 'none' : (sp.get('case') ?? ''),
    from: year(sp.get('from')),
    to: year(sp.get('to')),
    sort:
      oneOf(
        sp.get('sort'),
        SORT_OPTIONS.map((s) => s.value),
      ) || 'newest',
    view:
      oneOf(
        sp.get('view'),
        VIEW_MODES.map((v) => v.value),
      ) || 'grid',
    archived: sp.get('archived') === '1',
    review: sp.get('review') === '1',
  };
}

export function toSearchString(params: CatalogParams): string {
  const sp = new URLSearchParams();
  const set = (key: string, value: string | number | null | boolean, fallback: unknown) => {
    if (value !== fallback && value !== null && value !== '') sp.set(key, String(value));
  };
  set('q', params.q.trim(), '');
  set('region', params.region, '');
  set('culture', params.culture, '');
  set('condition', params.condition, '');
  set('rarity', params.rarity, '');
  set('originality', params.originality, '');
  set('case', params.caseId, '');
  set('from', params.from, null);
  set('to', params.to, null);
  set('sort', params.sort, 'newest');
  set('view', params.view, 'grid');
  if (params.archived) sp.set('archived', '1');
  if (params.review) sp.set('review', '1');
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export function activeFilterCount(p: CatalogParams): number {
  return [
    p.region,
    p.culture,
    p.condition,
    p.rarity,
    p.originality,
    p.caseId,
    p.from != null || p.to != null ? 'era' : '',
    p.archived ? 'archived' : '',
    p.review ? 'review' : '',
  ].filter(Boolean).length;
}
