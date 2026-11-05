import { describe, it, expect } from 'vitest';
import { parseAgeRange, formatYear, formatPeriod } from '@/lib/period';
import { matchCulture, cultureFor, regionFor, groupByCulture } from '@/lib/taxonomy';

describe('parseAgeRange', () => {
  it.each([
    ['1200–1400 AD', { start: 1200, end: 1400 }],
    ['1050-1200 CE', { start: 1050, end: 1200 }],
    ['800 BCE–1 CE', { start: -800, end: 1 }],
    ['500–200 BCE', { start: -500, end: -200 }],
    ['c. 1200 CE', { start: 1200, end: 1200 }],
    ['~900/1000–1700 CE', { start: 900, end: 1700 }],
    ['~14,000 BCE', { start: -14000, end: -14000 }],
    ['1000 to 1500', { start: 1000, end: 1500 }],
    ['1400 AD – 1200 AD', { start: 1200, end: 1400 }],
    ['13th–15th c.', { start: 1201, end: 1500 }],
    ['late 7th–mid 8th century', { start: 601, end: 800 }],
    ['5th century BCE', { start: -500, end: -401 }],
    ['12th century', { start: 1101, end: 1200 }],
  ])('parses %s', (text, expected) => {
    expect(parseAgeRange(text)).toEqual(expected);
  });

  it('returns null when nothing is datable', () => {
    expect(parseAgeRange(null)).toBeNull();
    expect(parseAgeRange('')).toBeNull();
    expect(parseAgeRange('Unknown')).toBeNull();
    expect(parseAgeRange('99999 BCE')).toBeNull();
  });
});

describe('formatting periods', () => {
  it('formats single years and ranges in each era', () => {
    expect(formatYear(-800)).toBe('800 BCE');
    expect(formatYear(1200)).toBe('1200 CE');
    expect(formatPeriod(null, null)).toBe('');
    expect(formatPeriod(1200, null)).toBe('1200 CE');
    expect(formatPeriod(null, -50)).toBe('50 BCE');
    expect(formatPeriod(900, 900)).toBe('900 CE');
    expect(formatPeriod(-800, -200)).toBe('800–200 BCE');
    expect(formatPeriod(1050, 1200)).toBe('1050–1200 CE');
    expect(formatPeriod(-200, 300)).toBe('200 BCE – 300 CE');
  });
});

describe('matchCulture', () => {
  it('matches names, slash-parts, aliases and accents', () => {
    expect(matchCulture('Mississippian (Moundville phase)')?.id).toBe('mississippian');
    expect(matchCulture('Mexica')?.id).toBe('aztec-mexica');
    expect(matchCulture('Harappan red ware')?.id).toBe('indus-valley');
    expect(matchCulture('Taino adorno')?.id).toBe('taino');
    expect(matchCulture('Yangshao')?.id).toBe('yangshao-culture');
  });

  it('prefers the most specific (longest) match, then the earliest', () => {
    expect(matchCulture('Plains Village tradition')?.id).toBe('plains-village-middle-missouri');
    expect(matchCulture('Woodland / Hopewell')?.id).toBe('woodland');
    expect(matchCulture('Hopewell or Woodland')?.id).toBe('hopewell');
  });

  it('never matches partial words or empty input', () => {
    expect(matchCulture('Mayan')?.id).toBe('maya');
    expect(matchCulture('Incandescent glaze')).toBeUndefined();
    expect(matchCulture(null)).toBeUndefined();
    expect(matchCulture('')).toBeUndefined();
  });
});

describe('cultureFor / regionFor / groupByCulture', () => {
  it('prefers the structured culture id, then free text', () => {
    expect(cultureFor({ culture_id: 'moche', tribe_culture: 'Maya' })?.id).toBe('moche');
    expect(cultureFor({ culture_id: 'not-real', tribe_culture: 'Maya' })?.id).toBe('maya');
    expect(cultureFor({ culture_id: null, tribe_culture: null })).toBeUndefined();
  });

  it('derives region from the explicit value, else the culture', () => {
    expect(regionFor({ culture_id: 'moche', tribe_culture: null, region: 'Europe' })).toBe(
      'Europe',
    );
    expect(regionFor({ culture_id: 'moche', tribe_culture: null })).toBe('South America');
    expect(regionFor({ culture_id: null, tribe_culture: null })).toBeNull();
  });

  it('groups every item into exactly one culture or unclassified', () => {
    const items = [
      { id: '1', culture_id: 'maya', tribe_culture: null },
      { id: '2', culture_id: null, tribe_culture: 'Classic Maya' },
      { id: '3', culture_id: null, tribe_culture: 'mystery' },
    ];
    const { groups, unclassified } = groupByCulture(items);
    expect(groups.get('maya')?.map((i) => i.id)).toEqual(['1', '2']);
    expect(unclassified.map((i) => i.id)).toEqual(['3']);
  });
});
