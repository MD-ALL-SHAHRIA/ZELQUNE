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
