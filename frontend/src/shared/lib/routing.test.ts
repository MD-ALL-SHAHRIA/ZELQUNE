import { describe, expect, it } from 'vitest';
import { decideRoute } from './routing';

const sid = () => 'sid_0123456789abcdef';
/** Analytics consent given (marketing not). */
const YES = 'v1.a1.m0';
/** These rules describe the price experiment switched on (it is off by default). */
const decide = (path: string, cookies: Record<string, string> = {}) =>
  decideRoute(new URL(path, 'http://localhost:3100'), cookies, sid, { experiment: true });
const decideOff = (path: string, cookies: Record<string, string> = {}) =>
  decideRoute(new URL(path, 'http://localhost:3100'), cookies, sid);

describe('decideRoute with the price experiment off (the launch default)', () => {
  it('ignores ?p, serves the base price and sets no arm cookie', () => {
    const d = decideOff('/en/products/x?p=b');
    expect(d).toMatchObject({ pathname: '/en/base/products/x', segment: 'base' });
    if (d.kind === 'rewrite') expect(d.cookies.find((c) => c.name === 'zq_p')).toBeUndefined();
  });

  it('clears an arm remembered from before', () => {
    const d = decideOff('/en', { zq_p: 'b' });
    expect(d).toMatchObject({ segment: 'base' });
    if (d.kind === 'rewrite')
      expect(d.cookies).toContainEqual({ name: 'zq_p', value: '', maxAge: 0 });
  });
});

describe('decideRoute', () => {
  it('redirects paths without a language to English, keeping the query', () => {
    expect(decide('/')).toEqual({ kind: 'redirect', location: '/en' });
    expect(decide('/products/alo-arch-panel?p=b')).toEqual({
      kind: 'redirect',
      location: '/en/products/alo-arch-panel?p=b',
    });
  });

  it('serves the base price, outside the experiment, when there is no ?p', () => {
    const d = decide('/bn/products/alo-arch-panel', {
      zq_sid: 'existing_session_id1',
      zq_consent: YES,
    });
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
    const fresh = decide('/en', { zq_consent: YES });
    if (fresh.kind !== 'rewrite') throw new Error('expected rewrite');
    expect(fresh.cookies).toContainEqual({
      name: 'zq_sid',
      value: 'sid_0123456789abcdef',
      maxAge: 365 * 86_400,
    });
    const bad = decide('/en', { zq_sid: 'x', zq_consent: YES });
    if (bad.kind !== 'rewrite') throw new Error('expected rewrite');
    expect(bad.cookies.map((c) => c.name)).toContain('zq_sid');
  });

  it('keeps first-touch UTM only', () => {
    const d = decide('/bn?utm_source=facebook&utm_campaign=launch&utm_x=1', { zq_consent: YES });
    if (d.kind !== 'rewrite') throw new Error('expected rewrite');
    expect(d.cookies).toContainEqual({
      name: 'zq_utm',
      value: JSON.stringify({ source: 'facebook', campaign: 'launch' }),
      maxAge: 30 * 86_400,
    });
    const again = decide('/bn?utm_source=google', {
      zq_utm: '{"source":"facebook"}',
      zq_sid: 'existing_session_id1',
      zq_consent: YES,
    });
    if (again.kind !== 'rewrite') throw new Error('expected rewrite');
    expect(again.cookies.find((c) => c.name === 'zq_utm')).toBeUndefined();
  });

  it('cannot be tricked into a different arm through the hidden segment', () => {
    expect(decide('/en/a/products/x')).toMatchObject({ pathname: '/en/base/a/products/x' });
  });
});

describe('decideRoute and cookie consent', () => {
  it('sets no analytics cookies before consent, even with campaign parameters', () => {
    const d = decideOff('/en?utm_source=facebook');
    if (d.kind !== 'rewrite') throw new Error('expected rewrite');
    expect(d.cookies.map((c) => c.name)).not.toContain('zq_sid');
    expect(d.cookies.map((c) => c.name)).not.toContain('zq_utm');
  });

  it('clears analytics cookies when consent is refused or withdrawn', () => {
    const d = decideOff('/en', {
      zq_sid: 'existing_session_id1',
      zq_utm: '{"source":"x"}',
      zq_consent: 'v1.a0.m0',
    });
    if (d.kind !== 'rewrite') throw new Error('expected rewrite');
    expect(d.cookies).toContainEqual({ name: 'zq_sid', value: '', maxAge: 0 });
    expect(d.cookies).toContainEqual({ name: 'zq_utm', value: '', maxAge: 0 });
  });

  it('treats a choice from an older consent version as no choice', () => {
    const d = decideOff('/en', { zq_consent: 'v0.a1.m1' });
    if (d.kind !== 'rewrite') throw new Error('expected rewrite');
    expect(d.cookies.map((c) => c.name)).not.toContain('zq_sid');
  });
});
