import { AppError } from '@zelqune/common';
import { type SessionTokens } from '@zelqune/contracts';
import request from 'supertest';
import { ALLOWED_ORIGIN, createGatewayHarness, type GatewayHarness } from './helpers';

const OWNER = {
  id: '0b6f0a3e-7f2a-4c35-9a5e-2f1d0c1b2a3e',
  phone: '+8801712345678',
  name: 'Owner',
  email: null,
  role: 'OWNER' as const,
};

const session = (n: number): SessionTokens => ({
  accessToken: `access-${n}`,
  expiresIn: 900,
  refreshToken: `refresh-token-${n}`,
  refreshExpiresAt: new Date(Date.now() + 30 * 864e5).toISOString(),
  user: OWNER,
});

const invalid = () => new AppError('INVALID_CREDENTIALS', 'Invalid phone or password', 401);

describe('admin auth (e2e, identity mocked)', () => {
  let h: GatewayHarness;
  let ipCounter = 0;
  // unique client IP per test so the per-IP login throttler doesn't interfere
  const ip = () => `198.51.100.${++ipCounter}`;

  beforeEach(async () => {
    h = await createGatewayHarness({ LOGIN_MAX_PER_IP: '100' });
  });
  afterEach(async () => {
    await h.app.close();
  });

  const login = (password: string, from = ip(), phone = '01712345678') =>
    request(h.app.getHttpServer())
      .post('/v1/admin/auth/login')
      .set('x-forwarded-for', from)
      .send({ phone, password });

  it('login normalises the phone, returns the access token and sets a hardened refresh cookie', async () => {
    h.clients.identity.send.mockResolvedValueOnce(session(1));
    const res = await login('correct-password').expect(200);

    expect(res.body).toEqual({
      accessToken: 'access-1',
      tokenType: 'Bearer',
      expiresIn: 900,
      user: OWNER,
    });
    expect(h.clients.identity.send).toHaveBeenCalledWith(
      'identity.auth.login',
      expect.objectContaining({
        phone: '+8801712345678',
        password: 'correct-password',
        ip: expect.any(String),
      }),
    );
    const cookie = String(res.headers['set-cookie']);
    expect(cookie).toMatch(/^zq_rt=refresh-token-1;/);
    expect(cookie).toContain('Path=/v1/admin/auth');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Secure');
    expect(cookie).toContain('SameSite=Strict');
    expect(cookie).not.toContain('refresh-token-1"'); // never in the body
    expect(JSON.stringify(res.body)).not.toContain('refresh-token-1');
  });

  it('rejects invalid input with 400 before calling identity', async () => {
    const res = await login('x', ip(), '12345').expect(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
    expect(h.clients.identity.send).not.toHaveBeenCalled();
  });

  it('per-phone lock counts FAILED attempts only, across IPs, and a success resets it', async () => {
    h.clients.identity.send.mockImplementation((_p: string, data: { password: string }) =>
      data.password === 'correct-password'
        ? Promise.resolve(session(1))
        : Promise.reject(invalid()),
    );
    for (let i = 0; i < 4; i++) await login('wrong', ip()).expect(401);
    await login('correct-password', ip()).expect(200); // success resets the counter
    for (let i = 0; i < 4; i++) await login('wrong', ip()).expect(401);
    await login('correct-password', ip()).expect(200); // still not locked: only 4 failures since reset

    // successes alone never lock
    for (let i = 0; i < 6; i++) await login('correct-password', ip()).expect(200);
  });

  it('locks the phone after 5 failures (even with the right password) and reports retryAfter', async () => {
    h.clients.identity.send.mockRejectedValue(invalid());
    for (let i = 0; i < 5; i++) await login('wrong', ip()).expect(401);

    h.clients.identity.send.mockResolvedValue(session(1));
    const res = await login('correct-password', ip()).expect(429);
    expect(res.body.error).toMatchObject({
      code: 'LOGIN_LOCKED',
      details: { retryAfterSeconds: expect.any(Number) },
    });
    // another phone is unaffected
    await login('correct-password', ip(), '01812345678').expect(200);
  });

  it('upstream errors other than invalid credentials do not count as failures', async () => {
    h.clients.identity.send.mockRejectedValue(new AppError('UPSTREAM_TIMEOUT', 'slow', 504));
    for (let i = 0; i < 6; i++) await login('whatever', ip()).expect(504);
    h.clients.identity.send.mockResolvedValue(session(1));
    await login('correct-password', ip()).expect(200);
  });

  it('per-IP login throttle applies to all attempts from one IP', async () => {
    const strict = await createGatewayHarness({ LOGIN_MAX_PER_IP: '2' });
    try {
      strict.clients.identity.send.mockResolvedValue(session(1));
      const hit = () =>
        request(strict.app.getHttpServer())
          .post('/v1/admin/auth/login')
          .set('x-forwarded-for', '192.0.2.10')
          .send({ phone: '01712345678', password: 'correct-password' });
      await hit().expect(200);
      await hit().expect(200);
      const res = await hit().expect(429);
      expect(res.body.error.code).toBe('TOO_MANY_REQUESTS');
      // non-login routes are not affected by the login throttler
      await request(strict.app.getHttpServer())
        .get('/health')
        .set('x-forwarded-for', '192.0.2.10')
        .expect(200);
    } finally {
      await strict.app.close();
    }
  });

  it('refresh rotates the cookie; 401 from identity clears it', async () => {
    h.clients.identity.send.mockResolvedValueOnce(session(2));
    const res = await request(h.app.getHttpServer())
      .post('/v1/admin/auth/refresh')
      .set('Origin', ALLOWED_ORIGIN)
      .set('Cookie', 'zq_rt=refresh-token-1')
      .expect(200);
    expect(res.body.accessToken).toBe('access-2');
    expect(String(res.headers['set-cookie'])).toMatch(/^zq_rt=refresh-token-2;/);
    expect(h.clients.identity.send).toHaveBeenCalledWith(
      'identity.auth.refresh',
      expect.objectContaining({ refreshToken: 'refresh-token-1' }),
    );

    h.clients.identity.send.mockRejectedValueOnce(
      new AppError('REFRESH_TOKEN_REUSED', 'Session revoked', 401),
    );
    const reused = await request(h.app.getHttpServer())
      .post('/v1/admin/auth/refresh')
      .set('Cookie', 'zq_rt=refresh-token-1')
      .expect(401);
    expect(reused.body.error.code).toBe('REFRESH_TOKEN_REUSED');
    expect(String(reused.headers['set-cookie'])).toMatch(/^zq_rt=;.*Expires=Thu, 01 Jan 1970/);
  });

  it('refresh without a cookie is 401; from a foreign Origin is 403', async () => {
    await request(h.app.getHttpServer()).post('/v1/admin/auth/refresh').expect(401);
    const res = await request(h.app.getHttpServer())
      .post('/v1/admin/auth/refresh')
      .set('Origin', 'https://evil.example')
      .set('Cookie', 'zq_rt=refresh-token-1')
      .expect(403);
    expect(res.body.error.code).toBe('ORIGIN_NOT_ALLOWED');
    expect(h.clients.identity.send).not.toHaveBeenCalled();
  });

  it('logout revokes upstream and clears the cookie (204), even without a cookie', async () => {
    h.clients.identity.send.mockResolvedValueOnce({ ok: true });
    const res = await request(h.app.getHttpServer())
      .post('/v1/admin/auth/logout')
      .set('Cookie', 'zq_rt=refresh-token-9')
      .expect(204);
    expect(h.clients.identity.send).toHaveBeenCalledWith('identity.auth.logout', {
      refreshToken: 'refresh-token-9',
    });
    expect(String(res.headers['set-cookie'])).toMatch(/^zq_rt=;/);
    await request(h.app.getHttpServer()).post('/v1/admin/auth/logout').expect(204);
  });

  describe('GET /v1/admin/auth/me (JWT + role guards)', () => {
    const me = () => request(h.app.getHttpServer()).get('/v1/admin/auth/me');

    it('401 without a token or with a garbage/expired/non-access token', async () => {
      expect((await me().expect(401)).body.error.code).toBe('UNAUTHENTICATED');
      expect(
        (await me().set('Authorization', 'Bearer not.a.jwt').expect(401)).body.error.code,
      ).toBe('INVALID_TOKEN');
      const expired = await h.signAccessToken(
        { sub: OWNER.id, role: 'OWNER' },
        { expiresIn: '-1m' },
      );
      await me().set('Authorization', `Bearer ${expired}`).expect(401);
      const refreshTyped = await h.signAccessToken({
        sub: OWNER.id,
        role: 'OWNER',
        typ: 'refresh',
      });
      await me().set('Authorization', `Bearer ${refreshTyped}`).expect(401);
    });

    it('403 for CUSTOMER, 200 for OWNER and STAFF', async () => {
      const customer = await h.signAccessToken({ sub: OWNER.id, role: 'CUSTOMER' });
      expect(
        (await me().set('Authorization', `Bearer ${customer}`).expect(403)).body.error.code,
      ).toBe('FORBIDDEN');

      h.clients.identity.send.mockResolvedValue(OWNER);
      for (const role of ['OWNER', 'STAFF']) {
        const token = await h.signAccessToken({ sub: OWNER.id, role });
        const res = await me().set('Authorization', `Bearer ${token}`).expect(200);
        expect(res.body).toEqual(OWNER);
      }
      expect(h.clients.identity.send).toHaveBeenCalledWith('identity.users.me', {
        userId: OWNER.id,
      });
    });
  });
});
