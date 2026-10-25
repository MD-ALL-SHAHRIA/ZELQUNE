import { RPC_PATTERNS } from '@zelqune/contracts';
import request from 'supertest';
import { createGatewayHarness, type GatewayHarness } from './helpers';

const ID = '9d1f6c2e-3b4a-4c5d-8e7f-6a5b4c3d2e1f';
const meta = { updatedAt: null, updatedBy: null };

describe('settings, team and account routes (e2e, services mocked)', () => {
  let h: GatewayHarness;
  let owner: string;
  let staff: string;

  beforeAll(async () => {
    h = await createGatewayHarness();
    owner = await h.signAccessToken({ sub: ID, role: 'OWNER' });
    staff = await h.signAccessToken({ sub: ID, role: 'STAFF' });
  });
  afterAll(async () => {
    await h.app.close();
  });
  beforeEach(() => {
    for (const c of Object.values(h.clients)) c.send.mockReset();
  });
  const call = (method: 'get' | 'put' | 'post', path: string, token: string, body?: object) =>
    request(h.app.getHttpServer())[method](path).set('Authorization', `Bearer ${token}`).send(body);

  it('staff can read settings; only the owner can change them', async () => {
    h.clients.shipping.send.mockResolvedValue({
      value: {
        dhakaFeePaisa: 7000,
        suburbFeePaisa: 11000,
        outsideFeePaisa: 13000,
        baseWeightGrams: 1000,
        extraPerKgPaisa: 2000,
      },
      meta,
    });
    await call('get', '/v1/admin/settings/shipping', staff).expect(200);
    const body = {
      dhakaFeePaisa: 8000,
      suburbFeePaisa: 11000,
      outsideFeePaisa: 13000,
      baseWeightGrams: 1000,
      extraPerKgPaisa: 2000,
    };
    await call('put', '/v1/admin/settings/shipping', staff, body).expect(403);
    await call('put', '/v1/admin/settings/shipping', owner, body).expect(200);
    expect(h.clients.shipping.send).toHaveBeenLastCalledWith(
      RPC_PATTERNS.shipping.settings.update,
      body,
    );
  });

  it('validates payment numbers and team passwords', async () => {
    await call('put', '/v1/admin/settings/payments', owner, {
      bkash: { number: '12345', accountType: 'personal' },
      nagad: { number: null, accountType: 'personal' },
    }).expect(400);
    await call('post', '/v1/admin/team', owner, {
      phone: '01711111111',
      name: 'Rafi',
      password: 'short',
    }).expect(400);
    await call('get', '/v1/admin/team', staff).expect(403);
  });

  it('anyone signed in can change their own password', async () => {
    h.clients.identity.send.mockResolvedValue({ ok: true });
    await call('put', '/v1/admin/account/password', staff, {
      currentPassword: 'old-password-1',
      newPassword: 'new-password-22',
    }).expect(200, { ok: true });
    expect(h.clients.identity.send).toHaveBeenCalledWith(
      RPC_PATTERNS.identity.team.changePassword,
      expect.objectContaining({ userId: ID }),
    );
  });
});
