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
