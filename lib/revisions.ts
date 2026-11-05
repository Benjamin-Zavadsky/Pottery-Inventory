import type { Revision } from './types';

const IGNORED = new Set(['updated_at', 'search_tsv']);

export function changedKeys(rev: Revision): string[] {
  if (rev.operation !== 'UPDATE') return [];
  const keys = new Set([...Object.keys(rev.old_row ?? {}), ...Object.keys(rev.new_row ?? {})]);
  return [...keys].filter(
    (k) =>
      !IGNORED.has(k) &&
      JSON.stringify(rev.old_row?.[k] ?? null) !== JSON.stringify(rev.new_row?.[k] ?? null),
  );
}

export function describeRevision(rev: Revision): string {
  if (rev.operation === 'INSERT') return 'Created';
  if (rev.operation === 'DELETE') return 'Deleted';
  const keys = changedKeys(rev);
  return keys.length ? `Changed ${keys.join(', ')}` : 'Saved (no field changes)';
}
