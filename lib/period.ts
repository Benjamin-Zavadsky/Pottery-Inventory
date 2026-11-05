export type Period = { start: number; end: number };

const BCE = /^(bce|bc|b\.c\.?)$/;

function eraSign(era: string | undefined): -1 | 1 | 0 {
  if (!era) return 0;
  return BCE.test(era) ? -1 : 1;
}

function ordered(a: number, b: number): Period {
  return a <= b ? { start: a, end: b } : { start: b, end: a };
}

function parseCenturies(text: string): Period | null {
  const m =
    /(\d{1,2})(?:st|nd|rd|th)(?:\s*-\s*(?:\w+\s+)?(\d{1,2})(?:st|nd|rd|th))?\s*(?:c\b|c\.|cent\w*)\s*(bce|bc|b\.c\.?|ce|ad|a\.d\.?)?/.exec(
      text,
    );
  if (!m) return null;
  const sign = eraSign(m[3]) || 1;
  const first = Number(m[1]);
  const last = m[2] ? Number(m[2]) : first;
  if (sign === 1) return ordered((first - 1) * 100 + 1, last * 100);
  return ordered(-first * 100, -(last - 1) * 100 - 1);
}

export function parseAgeRange(raw: string | null | undefined): Period | null {
  if (!raw) return null;
  const text = raw
    .toLowerCase()
    .replace(/(\d),(\d{3})/g, '$1$2')
    .replace(/[–—]|\bto\b/g, '-');

  if (/(st|nd|rd|th)\s*(?:-\s*(?:\w+\s+)?\d{1,2}(?:st|nd|rd|th))?\s*(c\b|c\.|cent)/.test(text)) {
    return parseCenturies(text);
  }

  const tokens = [...text.matchAll(/(\d{1,5})(?:\/\d{1,5})?\s*(bce|bc|b\.c\.?|ce|ad|a\.d\.?)?/g)]
    .map((m) => ({ n: Number(m[1]), sign: eraSign(m[2]) }))
    .filter((t) => t.n <= 20000);
  if (!tokens.length) return null;

  const first = tokens[0];
  const last = tokens[tokens.length - 1];
  const firstSign = first.sign || last.sign || 1;
  const lastSign = last.sign || first.sign || 1;
  return ordered(first.n * firstSign, last.n * lastSign);
}

export function formatYear(year: number): string {
  return year < 0 ? `${-year} BCE` : `${year} CE`;
}

export function formatPeriod(start: number | null, end: number | null): string {
  if (start == null && end == null) return '';
  if (start == null || end == null || start === end) return formatYear((start ?? end) as number);
  if (start < 0 && end < 0) return `${-start}–${-end} BCE`;
  if (start > 0 && end > 0) return `${start}–${end} CE`;
  return `${formatYear(start)} – ${formatYear(end)}`;
}
