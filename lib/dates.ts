const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

// Date-only strings ("2024-03-15") parse as UTC midnight, which renders as the
// previous day west of Greenwich — build them in local time instead.
export function formatDateOnly(value: string): string {
  const m = DATE_ONLY.exec(value);
  const date = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(value);
  return date.toLocaleDateString();
}

export function formatDateTime(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}
