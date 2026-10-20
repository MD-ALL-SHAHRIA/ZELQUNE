import { describe, expect, it } from 'vitest';
import { decideRoute } from './routing';

const sid = () => 'sid_0123456789abcdef';
const decide = (path: string, cookies: Record<string, string> = {}) =>
  decideRoute(new URL(path, 'http://localhost:3100'), cookies, sid);

describe('decideRoute', () => {
  it('redirects paths without a language to English, keeping the query', () => {
    expect(decide('/')).toEqual({ kind: 'redirect', location: '/en' });
    expect(decide('/products/alo-arch-panel?p=b')).toEqual({
      kind: 'redirect',
      location: '/en/products/alo-arch-panel?p=b',
    });
  });

  it('serves the base price, outside the experiment, when there is no ?p', () => {
    const d = decide('/bn/products/alo-arch-panel', { zq_sid: 'existing_session_id1' });
    expect(d).toEqual({
      kind: 'rewrite',
      pathname: '/bn/base/products/alo-arch-panel',
      segment: 'base',
      cookies: [],
    });
  });

  it('remembers the first ?p for 90 days and ignores later ones', () => {
    const first = decide('/en?p=b');
    expect(first).toMatchObject({ pathname: '/en/b', segment: 'b' });
    if (first.kind !== 'rewrite') throw new Error('expected rewrite');
    expect(first.cookies).toContainEqual({ name: 'zq_p', value: 'b', maxAge: 90 * 86_400 });

    const later = decide('/en/products/x?p=a', { zq_p: 'b' });
    expect(later).toMatchObject({ pathname: '/en/b/products/x', segment: 'b' });
    if (later.kind !== 'rewrite') throw new Error('expected rewrite');
    expect(later.cookies.find((c) => c.name === 'zq_p')).toBeUndefined();
  });

  it('ignores unknown arms', () => {
    expect(decide('/en?p=z')).toMatchObject({ segment: 'base' });
    expect(decide('/en', { zq_p: 'evil' })).toMatchObject({ segment: 'base' });
  });

  it('issues a session id only when missing or malformed', () => {
    const fresh = decide('/en');
    if (fresh.kind !== 'rewrite') throw new Error('expected rewrite');
    expect(fresh.cookies).toContainEqual({
      name: 'zq_sid',
      value: 'sid_0123456789abcdef',
      maxAge: 365 * 86_400,
    });
    const bad = decide('/en', { zq_sid: 'x' });
    if (bad.kind !== 'rewrite') throw new Error('expected rewrite');
    expect(bad.cookies.map((c) => c.name)).toContain('zq_sid');
  });

  it('keeps first-touch UTM only', () => {
    const d = decide('/bn?utm_source=facebook&utm_campaign=launch&utm_x=1');
    if (d.kind !== 'rewrite') throw new Error('expected rewrite');
    expect(d.cookies).toContainEqual({
      name: 'zq_utm',
      value: JSON.stringify({ source: 'facebook', campaign: 'launch' }),
      maxAge: 30 * 86_400,
    });
    const again = decide('/bn?utm_source=google', { zq_utm: '{"source":"facebook"}' });
    if (again.kind !== 'rewrite') throw new Error('expected rewrite');
    expect(again.cookies.find((c) => c.name === 'zq_utm')).toBeUndefined();
  });

  it('cannot be tricked into a different arm through the hidden segment', () => {
    expect(decide('/en/a/products/x')).toMatchObject({ pathname: '/en/base/a/products/x' });
  });
});
