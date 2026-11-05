import { describe, it, expect } from 'vitest';
import {
  DEFAULT_PARAMS,
  activeFilterCount,
  parseCatalogParams,
  toSearchString,
} from '@/lib/catalogParams';

const parse = (s: string) => parseCatalogParams(new URLSearchParams(s));

describe('catalog URL params', () => {
  it('defaults everything for an empty query string', () => {
    expect(parse('')).toEqual(DEFAULT_PARAMS);
    expect(toSearchString(DEFAULT_PARAMS)).toBe('');
  });

  it('round-trips every filter', () => {
    const qs =
      '?q=bowl&region=Mesoamerica&culture=maya&condition=Good&rarity=Rare&originality=Unknown&case=A&from=-1000&to=500&sort=age-asc&view=map&archived=1&review=1';
    const params = parse(qs.slice(1));
    expect(params).toMatchObject({
      q: 'bowl',
      region: 'Mesoamerica',
      culture: 'maya',
      caseId: 'A',
      from: -1000,
      to: 500,
      sort: 'age-asc',
      view: 'map',
      archived: true,
      review: true,
    });
    expect(toSearchString(params)).toBe(qs);
    expect(activeFilterCount(params)).toBe(9);
  });

  it('rejects unknown values instead of trusting the URL', () => {
    const params = parse(
      'region=Atlantis&culture=nope&condition=Perfect&sort=x&view=y&from=abc&to=1.5',
    );
    expect(params).toEqual(DEFAULT_PARAMS);
  });

  it('maps the legacy unassigned link to the "none" case filter', () => {
    expect(parse('unassigned=1').caseId).toBe('none');
  });

  it('counts an era range once', () => {
    expect(activeFilterCount({ ...DEFAULT_PARAMS, from: 1 })).toBe(1);
    expect(activeFilterCount({ ...DEFAULT_PARAMS, from: 1, to: 2 })).toBe(1);
  });
});
