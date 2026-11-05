export function changedFields<T extends object>(before: T, after: Partial<T>): Partial<T> {
  const changes: Partial<T> = {};
  for (const key of Object.keys(after) as (keyof T)[]) {
    if (JSON.stringify(before[key] ?? null) !== JSON.stringify(after[key] ?? null)) {
      changes[key] = after[key];
    }
  }
  return changes;
}
