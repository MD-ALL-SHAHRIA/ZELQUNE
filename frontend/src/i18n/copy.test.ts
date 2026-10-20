import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { bn } from './dictionaries/bn';
import { en } from './dictionaries/en';

const doc = (name: string) =>
  readFileSync(new URL(`../../../docs/${name}`, import.meta.url), 'utf8');

function leaves(value: unknown, path = ''): [string, string][] {
  if (typeof value === 'string') return [[path, value]];
  if (Array.isArray(value)) return value.flatMap((v, i) => leaves(v, `${path}[${i}]`));
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([k, v]) => leaves(v, path ? `${path}.${k}` : k));
  }
  return [];
}

/** `{slot}` matches whatever the doc has there (a `[[...]]` placeholder or bold markup). */
const asPattern = (text: string) =>
  new RegExp(
    text
      .split(/\{\w+\}/)
      .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('.+?'),
  );

describe('copy dictionaries', () => {
  it('en and bn have exactly the same keys', () => {
    expect(leaves(bn).map(([k]) => k)).toEqual(leaves(en).map(([k]) => k));
  });

  it.each([
    ['en', en, 'copy-en.md'],
    ['bn', bn, 'copy-bn.md'],
  ] as const)('every %s string comes from docs/%s', (_lang, dict, file) => {
    const text = doc(file);
    const missing = leaves(dict).filter(([, value]) => !asPattern(value).test(text));
    expect(missing).toEqual([]);
  });

  it('never claims stock for pre-order or made-to-order products', () => {
    for (const dict of [en, bn]) {
      for (const badge of [dict.product.badge.PRE_ORDER, dict.product.badge.MADE_TO_ORDER]) {
        expect(badge).not.toMatch(/in stock|স্টকে আছে/i);
      }
    }
  });
});
