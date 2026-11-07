import pagesJson from '../../assets/site/pages.json';

/** An element's box on a captured page, in page CSS px. */
export type El = { text: string; x: number; y: number; w: number; h: number };
export type PageShot = {
  file: string; width: number; height: number; dpr: number;
  headings: El[]; buttons: El[]; cards: El[]; forms: El[]; inputs: El[]; images: El[]; sections: El[];
};
export type PageName = 'home' | 'shop' | 'product' | 'design' | 'construction' | 'bulk' | 'story' | 'faq' | 'track';
export type Device = 'desktop' | 'mobile';

const pages = pagesJson as unknown as Record<PageName, Record<Device, PageShot>>;

export function page(name: PageName, device: Device): PageShot & { src: string } {
  const p = pages[name][device];
  return { ...p, src: `site/${p.file}` };
}

/** Find an element of a kind by index, or by (case-insensitive) text match. */
export function el(p: PageShot, kind: 'headings' | 'buttons' | 'cards' | 'forms' | 'inputs' | 'images' | 'sections', match: number | string = 0): El {
  const list = p[kind];
  const found = typeof match === 'number' ? list[match] : list.find((e) => e.text.toLowerCase().includes(match.toLowerCase()));
  if (!found) throw new Error(`No ${kind} "${match}" on ${p.file}`);
  return found;
}
