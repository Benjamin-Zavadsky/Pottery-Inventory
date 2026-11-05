import { CULTURES, CULTURE_BY_ID, type Culture, type Region } from './constants';

const ALIASES: Record<string, string[]> = {
  'ancestral-puebloans': ['ancestral puebloan', 'anasazi'],
  'aztec-mexica': ['aztec iii'],
  'casas-grandes': ['paquime', 'ramos polychrome'],
  'ancient-greece': ['attic', 'greek', 'corinthian'],
  'ancient-rome': ['roman', 'arretine', 'terra sigillata', 'samian'],
  'ancient-egypt': ['egyptian'],
  'celtic-europe': ['la tene', 'celtic'],
  'neolithic-europe': ['linear pottery', 'lbk'],
  'n-black-polished-ware': ['northern black polished ware', 'nbpw'],
  'indus-valley': ['harappan'],
  'islamic-lusterware': ['abbasid'],
  'greater-nicoya': ['nicoya', 'papagayo'],
  'gran-cocle': ['cocle'],
  'jingdezhen-porcelain': ['jingdezhen', 'qingbai'],
  'goryeo-celadon': ['goryeo', 'koryo'],
  'longquan-celadon': ['longquan'],
  'tang-sancai': ['sancai'],
  'cizhou-ware': ['cizhou'],
  maya: ['mayan'],
  nazca: ['nasca'],
  wari: ['huari'],
  chimu: ['chimor'],
  moche: ['mochica'],
  inca: ['inka'],
  tiwanaku: ['tiahuanaco'],
};

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const MATCHERS: { culture: Culture; token: string; pattern: RegExp }[] = CULTURES.flatMap(
  (culture) => {
    const parts = culture.culture.split('/').map((p) => normalize(p.replace(/\bculture\b/i, '')));
    const tokens = [
      ...new Set([normalize(culture.culture), ...parts, ...(ALIASES[culture.id] ?? [])]),
    ];
    return tokens
      .filter(Boolean)
      .map((token) => ({ culture, token, pattern: new RegExp(`\\b${token}\\b`) }));
  },
);

// Picks the most specific culture named in free text: the longest matching
// token wins, ties go to whichever is mentioned first. One piece maps to at
// most one culture, so map/tree counts never double-count.
export function matchCulture(text: string | null | undefined): Culture | undefined {
  if (!text) return undefined;
  const hay = normalize(text);
  let best: { culture: Culture; length: number; index: number } | undefined;
  for (const { culture, token, pattern } of MATCHERS) {
    const m = pattern.exec(hay);
    if (!m) continue;
    if (
      !best ||
      token.length > best.length ||
      (token.length === best.length && m.index < best.index)
    ) {
      best = { culture, length: token.length, index: m.index };
    }
  }
  return best?.culture;
}

type Classifiable = {
  culture_id: string | null;
  tribe_culture: string | null;
  region?: Region | null;
};

export function cultureFor(item: Classifiable): Culture | undefined {
  return (item.culture_id && CULTURE_BY_ID[item.culture_id]) || matchCulture(item.tribe_culture);
}

export function regionFor(item: Classifiable): Region | null {
  return item.region ?? cultureFor(item)?.region ?? null;
}

export function groupByCulture<T extends Classifiable>(items: T[]) {
  const groups = new Map<string, T[]>();
  const unclassified: T[] = [];
  for (const item of items) {
    const culture = cultureFor(item);
    if (!culture) {
      unclassified.push(item);
      continue;
    }
    const list = groups.get(culture.id);
    if (list) list.push(item);
    else groups.set(culture.id, [item]);
  }
  return { groups, unclassified };
}
