/** Keys of `changes` whose value differs from `current` (arrays compared as sorted sets). */
export function changedFields<T extends object>(
  current: T,
  changes: Partial<T>,
): (keyof T & string)[] {
  return (Object.keys(changes) as (keyof T & string)[]).filter((key) => {
    const next = changes[key];
    const prev = current[key];
    if (next === undefined) return false;
    if (Array.isArray(next) && Array.isArray(prev)) {
      return [...next].sort().join('\u0000') !== [...prev].sort().join('\u0000');
    }
    return next !== prev;
  });
}

/** Compares variant option maps independent of key order (jsonb does not preserve it). */
export function sameOptions(stored: unknown, next: Record<string, string>): boolean {
  if (!stored || typeof stored !== 'object' || Array.isArray(stored))
    return Object.keys(next).length === 0;
  const a = Object.entries(stored as Record<string, unknown>).sort(([x], [y]) =>
    x.localeCompare(y),
  );
  const b = Object.entries(next).sort(([x], [y]) => x.localeCompare(y));
  return a.length === b.length && a.every(([k, v], i) => k === b[i][0] && v === b[i][1]);
}
