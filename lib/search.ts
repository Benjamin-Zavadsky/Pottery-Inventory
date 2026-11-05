// Builds a prefix tsquery ("mimb bowl" → "mimb:* & bowl:*") so search works
// as-you-type; anything that isn't a letter or digit is dropped so user input
// can never produce tsquery syntax errors.
export function toPrefixTsQuery(input: string): string {
  return input
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
    .slice(0, 8)
    .map((t) => `${t}:*`)
    .join(' & ');
}
