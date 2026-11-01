import { type INestApplication } from '@nestjs/common';
import { Redis } from 'ioredis';
import request from 'supertest';
import { CustomerService } from '../../apps/identity-service/src/auth/customer.service';
import { PrismaService as IdentityDb } from '../../apps/identity-service/src/prisma/prisma.service';
import { seedOwner } from '../../apps/identity-service/src/seed/owner.seed';
import {
  EMAIL_PROVIDER,
  type EmailMessage,
  type EmailProvider,
} from '../../apps/notification-service/src/email/email.provider';
import { prepareDatabase } from './database';
import { IT } from './it-env';
import { OWNER, type Stack, startStack } from './stack';

const PERSON = {
  name: 'Nusrat Jahan',
  email: 'nusrat@example.com',
  phone: '01755555551',
  password: 'wooden moon lamp at dusk',
};
const COOKIE = 'zq_crt';

async function eventually<T>(
  fn: () => T | Promise<T>,
  ok: (v: T) => boolean,
  ms = 8000,
): Promise<T> {
  const end = Date.now() + ms;
  for (;;) {
    const v = await fn();
    if (ok(v) || Date.now() > end) return v;
    await new Promise((r) => setTimeout(r, 100));
  }
}

describe('customer accounts (ADR 0021) on real infrastructure', () => {
  let stack: Stack;
  let gw: INestApplication;
  let redis: Redis;
  const inbox: EmailMessage[] = [];
  let ip = 0;
  const http = () => request(gw.getHttpServer());
  const post = (path: string) =>
    http()
      .post(path)
      .set('x-forwarded-for', `198.40.0.${++ip}`)
      .set('cf-turnstile-response', 'dev-pass');
  const cookieOf = (res: request.Response): string | undefined =>
    ([] as string[])
      .concat(res.headers['set-cookie'] ?? [])
      .find((c) => c.startsWith(`${COOKIE}=`) && !c.startsWith(`${COOKIE}=;`))
      ?.split(';')[0];
  const tokenFrom = (m: EmailMessage) => /#token=([\w-]+)/.exec(m.text)?.[1] ?? '';
  const mailTo = (to: string, subject: RegExp) =>
    eventually(
      () => inbox.filter((m) => m.to === to && subject.test(m.subject)),
      (l) => l.length > 0,
    ).then((l) => l.at(-1)!);

  beforeAll(async () => {
    const database = await prepareDatabase('zelqune_it_customer_auth');
    redis = new Redis(IT.redisUrl);
    await redis.flushdb();
    stack = await startStack({
      database,
      services: ['identity', 'notification'],
      gatewayEnv: { LOGIN_MAX_PER_IP: '100', AUTH_EMAILS_PER_HOUR: '100' },
    });
    gw = stack.gateway;
    await seedOwner(stack.identity!);
    // Capture account emails instead of sending them.
    const provider = stack.notification!.get<EmailProvider>(EMAIL_PROVIDER);
    provider.send = (m) => {
      inbox.push(m);
      return Promise.resolve({ providerRef: 'it' });
    };
  });

  afterAll(async () => {
    await stack?.close();
    await redis?.quit();
  });

  it('registers, refuses sign-in until the email is confirmed, then signs in', async () => {
    const weak = await post('/v1/auth/register')
      .send({ ...PERSON, password: 'password123' })
      .expect(400);
    expect(weak.body.error.code).toBe('WEAK_PASSWORD');

    await post('/v1/auth/register').send(PERSON).expect(202);
    const verify = await mailTo(PERSON.email, /Confirm your email/);
    expect(verify.html).toContain('/en/account/verify#token=');

    const early = await post('/v1/auth/login').send({
      email: PERSON.email,
      password: PERSON.password,
    });
    expect([early.status, early.body.error.code]).toEqual([403, 'EMAIL_NOT_VERIFIED']);
    const wrong = await post('/v1/auth/login').send({
      email: PERSON.email,
      password: 'not the password',
    });
    expect([wrong.status, wrong.body.error.code]).toEqual([401, 'INVALID_CREDENTIALS']);

    const token = tokenFrom(verify);
    const ok = await post('/v1/auth/verify-email').send({ token }).expect(200);
    expect(ok.body.user.email).toBe(PERSON.email);
    expect(cookieOf(ok)).toBeDefined();
    const again = await post('/v1/auth/verify-email').send({ token }).expect(400);
    expect(again.body.error.code).toBe('INVALID_LINK');

    const login = await post('/v1/auth/login')
      .send({ email: 'NUSRAT@example.com ', password: PERSON.password })
      .expect(200);
    const me = await http()
      .get('/v1/auth/me')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(200);
    expect(me.body).toMatchObject({
      name: PERSON.name,
      email: PERSON.email,
      emailVerified: true,
      phone: '+8801755555551',
      hasPassword: true,
      providers: [],
    });
    // A customer token never opens the dashboard API.
    await http()
      .get('/v1/admin/orders')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(403);
  });

  it('never reveals whether an email or phone is known', async () => {
    const known = await post('/v1/auth/register')
      .send({ ...PERSON, phone: '01755555552' })
      .expect(202);
    await mailTo(PERSON.email, /already have a Zelqune account/);
    const phoneTaken = await post('/v1/auth/register')
      .send({ ...PERSON, email: 'someone.else@example.com' })
      .expect(202);
    await mailTo('someone.else@example.com', /couldn't create/);
    expect(known.body).toEqual(phoneTaken.body);
    const unknown = await post('/v1/auth/forgot-password')
      .send({ email: 'nobody@example.com' })
      .expect(202);
    expect(unknown.body).toEqual({ accepted: true });
    await new Promise((r) => setTimeout(r, 300));
    expect(inbox.some((m) => m.to === 'nobody@example.com')).toBe(false);
  });

  it('reset: single-use link, weak passwords refused, every old session signed out', async () => {
    const before = await post('/v1/auth/login')
      .send({ email: PERSON.email, password: PERSON.password })
      .expect(200);
    const oldCookie = cookieOf(before)!;
    await post('/v1/auth/forgot-password').send({ email: PERSON.email }).expect(202);
    const token = tokenFrom(await mailTo(PERSON.email, /Reset your Zelqune password/));
    await post('/v1/auth/reset-password').send({ token, password: '1234567890' }).expect(400);
    await post('/v1/auth/reset-password')
      .send({ token, password: 'brass hinge walnut shelf' })
      .expect(200);
    await post('/v1/auth/reset-password')
      .send({ token, password: 'another long passphrase' })
      .expect(400);
    await http().post('/v1/auth/refresh').set('Cookie', oldCookie).expect(401);
    await post('/v1/auth/login')
      .send({ email: PERSON.email, password: PERSON.password })
      .expect(401);
    PERSON.password = 'brass hinge walnut shelf';
    await post('/v1/auth/login')
      .send({ email: PERSON.email, password: PERSON.password })
      .expect(200);
  });

  it('rotates the session cookie, detects reuse, lists and ends sessions', async () => {
    const a = await post('/v1/auth/login')
      .send({ email: PERSON.email, password: PERSON.password })
      .expect(200);
    const first = cookieOf(a)!;
    const r1 = await http().post('/v1/auth/refresh').set('Cookie', first).expect(200);
    const second = cookieOf(r1)!;
    expect(second).not.toBe(first);
    await http().post('/v1/auth/refresh').set('Cookie', first).expect(401); // reuse: family revoked
    await http().post('/v1/auth/refresh').set('Cookie', second).expect(401);

    const b = await post('/v1/auth/login')
      .send({ email: PERSON.email, password: PERSON.password })
      .expect(200);
    await post('/v1/auth/login')
      .send({ email: PERSON.email, password: PERSON.password })
      .expect(200);
    const auth = { Authorization: `Bearer ${b.body.accessToken}`, Cookie: cookieOf(b)! };
    const list = await http().get('/v1/auth/sessions').set(auth).expect(200);
    expect(list.body.items.length).toBeGreaterThanOrEqual(2);
    expect(list.body.items.filter((s: { current: boolean }) => s.current)).toHaveLength(1);
    await http().post('/v1/auth/sessions/revoke-others').set(auth).expect(200);
    const after = await http().get('/v1/auth/sessions').set(auth).expect(200);
    expect(after.body.items).toHaveLength(1);
  });

  it('locks an account after repeated wrong passwords', async () => {
    for (let i = 0; i < 5; i++)
      await post('/v1/auth/login').send({ email: PERSON.email, password: `wrong-${i}-password` });
    const locked = await post('/v1/auth/login').send({
      email: PERSON.email,
      password: PERSON.password,
    });
    expect([locked.status, locked.body.error.code]).toEqual([429, 'LOGIN_LOCKED']);
  });

  it('social sign-in: new person completes with name and phone; pre-registered email is taken back safely', async () => {
    const customers = stack.identity!.get(CustomerService);
    const db = stack.identity!.get(IdentityDb);
    const google = {
      provider: 'GOOGLE' as const,
      providerUserId: 'g-123',
      email: 'Rafi@Example.com',
      emailVerified: true,
      name: 'Rafi Ahmed',
    };
    const first = await customers.oauth(google, {});
    expect(first).toMatchObject({ kind: 'pending', profile: { email: 'rafi@example.com' } });
    if (first.kind !== 'pending') throw new Error('expected pending');
    await customers.completeSignup(first.profile, { name: 'Rafi Ahmed', phone: '01811112222' }, {});
    const again = await customers.oauth(google, {});
    expect(again.kind).toBe('session');

    // Someone registered the victim's email with a password but never confirmed it.
    await post('/v1/auth/register')
      .send({
        name: 'Someone',
        email: 'victim@example.com',
        phone: '01911112222',
        password: 'attacker chose this one',
      })
      .expect(202);
    const outcome = await customers.oauth(
      { ...google, providerUserId: 'g-victim', email: 'victim@example.com', name: 'Victim' },
      {},
    );
    expect(outcome.kind).toBe('session');
    const victim = await db.user.findUnique({ where: { email: 'victim@example.com' } });
    expect(victim?.passwordHash).toBeNull();
    expect(victim?.emailVerifiedAt).not.toBeNull();
    await post('/v1/auth/login')
      .send({ email: 'victim@example.com', password: 'attacker chose this one' })
      .expect(401);

    // An unverified email from the provider is refused; admin accounts never link.
    await expect(
      customers.oauth({ ...google, providerUserId: 'g-x', emailVerified: false }, {}),
    ).rejects.toMatchObject({
      code: 'OAUTH_EMAIL_REQUIRED',
    });
    await db.user
      .update({ where: { phone: `+88${OWNER.phone}` }, data: { email: 'owner@example.com' } })
      .catch(() => undefined);
    await expect(
      customers.oauth({ ...google, providerUserId: 'g-owner', email: 'owner@example.com' }, {}),
    ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
  });

  it('social buttons are off until keys are set, and OAuth state cannot be forged', async () => {
    expect((await http().get('/v1/auth/providers').expect(200)).body).toEqual({ providers: [] });
    const start = await http().get('/v1/auth/oauth/google/start').expect(303);
    expect(start.headers.location).toContain('/en/account/login?error=OAUTH_DISABLED');
    const cb = await http().get('/v1/auth/oauth/google/callback?state=forged&code=x').expect(303);
    expect(cb.headers.location).toMatch(/account\/login\?error=OAUTH_STATE/);
  });
});
