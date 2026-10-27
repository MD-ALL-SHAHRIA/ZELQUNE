/**
 * Storefront texts the owner can rewrite from the dashboard (Content → Pages and policies),
 * by dictionary path. Only these paths are applied, so a saved key can never reshape the site.
 * The dashboard's list (dashboard/src/features/content/site-texts.ts) uses the same paths.
 */
export const EDITABLE_TEXTS = [
  'story.text',
  'privacy.text',
  ...[0, 1, 2, 3, 4, 5].map((i) => `terms.items.${i}`),
  ...[0, 1, 2, 3, 4, 5, 6].map((i) => `faq.items.${i}.a`),
  'landing.steps.1.text',
  'premium.timeline.1.text',
  'premium.trust.items.1.text',
  'premium.trust.items.3.text',
  'premium.materials.items.0.text',
  'premium.materials.items.2.text',
  'design.fees',
  'construction.stages.5.text',
  'footer.contact',
] as const;

const EDITABLE = new Set<string>(EDITABLE_TEXTS);

/** Copy of `node` with the string at `path` replaced; anything that isn't a string is left alone. */
function setPath<T>(node: T, [head, ...rest]: string[], value: string): T {
  if (head === undefined) return (typeof node === 'string' ? value : node) as T;
  if (Array.isArray(node)) {
    const i = Number(head);
    if (!Number.isInteger(i) || i < 0 || i >= node.length) return node;
    const copy = [...node];
    copy[i] = setPath(copy[i], rest, value);
    return copy as T;
  }
  if (node && typeof node === 'object' && Object.hasOwn(node, head)) {
    const record = node as Record<string, unknown>;
    return { ...record, [head]: setPath(record[head], rest, value) } as T;
  }
  return node;
}

/** The dictionary with the owner's texts for `lang` laid over it; empty texts keep the built-in copy. */
export function applyTexts<T>(
  dict: T,
  texts: Record<string, { en: string; bn: string }> | undefined,
  lang: 'en' | 'bn',
): T {
  let out = dict;
  for (const [path, value] of Object.entries(texts ?? {})) {
    const text = value[lang]?.trim();
    if (text && EDITABLE.has(path)) out = setPath(out, path.split('.'), text);
  }
  return out;
}
