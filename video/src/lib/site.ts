import pagesJson from '../../assets/site/pages.json';

/** An element's box on a captured page, in page CSS px. */
export type El = { text: string; x: number; y: number; w: number; h: number };
export type PageShot = {
  file: string; width: number; height: number; dpr: number;
  headings: El[]; buttons: El[]; cards: El[]; forms: El[]; inputs: El[]; images: El[]; sections: El[];
  texts?: El[]; nav?: El[];
};
export type PageName =
  | 'home' | 'shop' | 'product' | 'design' | 'construction' | 'bulk' | 'story' | 'faq' | 'track'
  | 'home-top' | 'home-menu' | 'home-steps' | 'home-values' | 'construction-build' | 'story-top' | 'design-top' | 'construction-top' | 'bulk-top';
export type Kind = 'headings' | 'buttons' | 'cards' | 'forms' | 'inputs' | 'images' | 'sections' | 'texts' | 'nav';
export type Device = 'desktop' | 'mobile';

const pages = pagesJson as unknown as Record<PageName, Record<Device, PageShot>>;

export function page(name: PageName, device: Device): PageShot & { src: string } {
  const p = pages[name][device];
  return { ...p, src: `site/${p.file}` };
}

/** Find an element of a kind by index, or by (case-insensitive) text match. */
export function el(p: PageShot, kind: Kind, match: number | string = 0): El {
  const list = p[kind] ?? [];
  const found = typeof match === 'number' ? list[match] : list.find((e) => e.text.toLowerCase().includes(match.toLowerCase()));
  if (!found) throw new Error(`No ${kind} "${match}" on ${p.file}`);
  return found;
}

/** A viewport screenshot from the older capture (screens/), treated as a one-screen page. */
export function viewShot(src: string, device: Device, base: PageShot): PageShot & { src: string } {
  const vp = device === 'desktop' ? { width: 1440, height: 900 } : { width: 390, height: 844 };
  return { ...base, file: src, src, width: vp.width, height: vp.height };
}

/** Grow a box by `pad` CSS px on every side. */
export const grow = (e: El, pad: number, padY = pad): El => ({ ...e, x: e.x - pad, y: e.y - padY, w: e.w + 2 * pad, h: e.h + 2 * padY });
/** The box that covers several elements. */
export function union(...els: El[]): El {
  const x = Math.min(...els.map((e) => e.x));
  const y = Math.min(...els.map((e) => e.y));
  return { text: els.map((e) => e.text).join(' '), x, y, w: Math.max(...els.map((e) => e.x + e.w)) - x, h: Math.max(...els.map((e) => e.y + e.h)) - y };
}
