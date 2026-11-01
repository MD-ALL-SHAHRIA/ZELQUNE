/** Client-side search over a small index the server renders into the header. Pure. */

export interface SearchEntry {
  href: string;
  /** Name in the page language. */
  title: string;
  /** Lowercased text matched against: both languages' names plus extra keywords. */
  haystack: string;
}

export interface ProductEntry extends SearchEntry {
  price: string | null;
  image: { src: string; alt: string } | null;
}

export interface SearchIndex {
  products: ProductEntry[];
  pages: SearchEntry[];
}

export function normalize(text: string): string {
  return text.normalize('NFC').toLocaleLowerCase('en').replace(/\s+/g, ' ').trim();
}

export function haystackOf(...parts: (string | null | undefined)[]): string {
  return normalize(parts.filter(Boolean).join(' '));
}

/** Every word of the query must appear (case-insensitive, English or Bangla). */
export function matches(entry: SearchEntry, query: string): boolean {
  const words = normalize(query).split(' ').filter(Boolean);
  return words.every((w) => entry.haystack.includes(w));
}

export function search(index: SearchIndex, query: string): SearchIndex {
  if (!normalize(query)) return index;
  return {
    products: index.products.filter((e) => matches(e, query)),
    pages: index.pages.filter((e) => matches(e, query)),
  };
}

/** Edit distance (insert, delete, replace), stopping early past `max`. */
export function distance(a: string, b: string, max = 2): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(
        (prev[j] ?? 0) + 1,
        (row[j - 1] ?? 0) + 1,
        (prev[j - 1] ?? 0) + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = row;
  }
  return prev[b.length] ?? max + 1;
}

/**
 * "Did you mean": replaces each query word that matches nothing with the closest word in the
 * index (1 typo for short words, 2 for longer), and returns the fixed query only when it finds
 * something. Null when the query is fine or nothing close exists.
 */
export function correct(index: SearchIndex, query: string): string | null {
  const words = normalize(query).split(' ').filter(Boolean);
  if (!words.length) return null;
  const all = [...index.products, ...index.pages];
  const vocab = [...new Set(all.flatMap((e) => e.haystack.split(/[^\p{L}\p{N}]+/u)))].filter(
    (w) => w.length >= 3,
  );
  let changed = false;
  const fixed = words.map((w) => {
    if (all.some((e) => e.haystack.includes(w))) return w;
    const limit = w.length <= 4 ? 1 : 2;
    let best: string | null = null;
    let bestD = limit + 1;
    for (const v of vocab) {
      const d = distance(w, v, limit);
      if (d < bestD) [best, bestD] = [v, d];
    }
    if (best) changed = true;
    return best ?? w;
  });
  if (!changed) return null;
  const next = fixed.join(' ');
  const found = search(index, next);
  return found.products.length || found.pages.length ? next : null;
}
