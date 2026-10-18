import { type AppError } from '@zelqune/common';
import { exportPKCS8, exportSPKI, generateKeyPair, importSPKI, jwtVerify } from 'jose';
import { type IdentityEnv } from '../config/identity-env';
import { type UserRecord, type UserRepository } from '../users/user.repository';
import {
  AuthService,
  INVALID_CREDENTIALS,
  INVALID_REFRESH_TOKEN,
  REFRESH_TOKEN_REUSED,
} from './auth.service';
import { PasswordService } from './password.service';
import {
  type NewRefreshToken,
  type RefreshTokenRecord,
  type RefreshTokenStore,
  type RevokeReason,
} from './refresh-token.repository';
import { TokenService } from './token.service';

class InMemoryRefreshTokens implements RefreshTokenStore {
  readonly rows = new Map<
    string,
    RefreshTokenRecord & { revokedReason?: RevokeReason; replacedById?: string }
  >();
  constructor(private readonly users: Map<string, UserRecord>) {}

  findByHash(tokenHash: string) {
    const row = [...this.rows.values()].find((r) => r.tokenHash === tokenHash);
    const user = row && this.users.get(row.userId);
    return Promise.resolve(row && user ? { ...row, user } : null);
  }
  create(t: NewRefreshToken) {
    this.rows.set(t.id, { ...t, revokedAt: null });
    return Promise.resolve();
  }
  markRotated(id: string, replacedById: string, at: Date) {
    const row = this.rows.get(id);
    if (!row || row.revokedAt) return Promise.resolve(false);
    Object.assign(row, { revokedAt: at, revokedReason: 'ROTATED', replacedById });
    return Promise.resolve(true);
  }
  revokeFamily(familyId: string, reason: RevokeReason, at: Date) {
    let n = 0;
    for (const row of this.rows.values()) {
      if (row.familyId === familyId && !row.revokedAt) {
        Object.assign(row, { revokedAt: at, revokedReason: reason });
        n++;
      }
    }
    return Promise.resolve(n);
  }
  transaction<T>(fn: (s: RefreshTokenStore) => Promise<T>): Promise<T> {
    return fn(this);
  }
  active(familyId: string) {
    return [...this.rows.values()].filter((r) => r.familyId === familyId && !r.revokedAt);
  }
}

describe('AuthService', () => {
  const PASSWORD = 'a-long-owner-password';
  let passwords: PasswordService;
  let tokens: TokenService;
  let publicKeyPem: string;
  let users: Map<string, UserRecord>;
  let store: InMemoryRefreshTokens;
  let service: AuthService;

  const owner = (): UserRecord => users.get('u-owner')!;

  beforeAll(async () => {
    passwords = new PasswordService();
    await passwords.onModuleInit();
    const { privateKey, publicKey } = await generateKeyPair('ES256', { extractable: true });
    publicKeyPem = await exportSPKI(publicKey);
    tokens = new TokenService({
      JWT_PRIVATE_KEY: await exportPKCS8(privateKey),
      JWT_ISSUER: 'zelqune-identity',
      JWT_AUDIENCE: 'zelqune-api',
      ACCESS_TOKEN_TTL_SECONDS: 900,
      REFRESH_TOKEN_TTL_DAYS: 30,
    } as IdentityEnv);
    await tokens.onModuleInit();
  });

  beforeEach(async () => {
    const hash = await passwords.hash(PASSWORD);
    users = new Map<string, UserRecord>([
      [
        'u-owner',
        {
          id: 'u-owner',
          phone: '+8801712345678',
          name: 'Owner',
          email: null,
          role: 'OWNER',
          passwordHash: hash,
          isActive: true,
        },
      ],
      [
        'u-customer',
        {
          id: 'u-customer',
          phone: '+8801812345678',
          name: null,
          email: null,
          role: 'CUSTOMER',
          passwordHash: hash,
          isActive: true,
        },
      ],
    ]);
    store = new InMemoryRefreshTokens(users);
    const userRepo = {
      findByPhone: (phone: string) =>
        Promise.resolve([...users.values()].find((u) => u.phone === phone) ?? null),
      findById: (id: string) => Promise.resolve(users.get(id) ?? null),
      updatePasswordHash: jest.fn(),
      touchLastLogin: jest.fn(),
    } as unknown as UserRepository;
    service = new AuthService(userRepo, store, passwords, tokens);
  });

  const login = () => service.login({ phone: '+8801712345678', password: PASSWORD, ip: '1.2.3.4' });

  describe('login', () => {
    it('issues an ES256 access token with role claims and an opaque refresh token', async () => {
      const session = await login();
      const { payload, protectedHeader } = await jwtVerify(
        session.accessToken,
        await importSPKI(publicKeyPem, 'ES256'),
        { issuer: 'zelqune-identity', audience: 'zelqune-api' },
      );
      expect(protectedHeader.alg).toBe('ES256');
      expect(payload).toMatchObject({ sub: 'u-owner', role: 'OWNER', typ: 'access' });
      expect(payload.exp! - payload.iat!).toBe(900);
      expect(session.refreshToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
      // only the hash is stored
      const [row] = store.rows.values();
      expect(row.tokenHash).toBe(tokens.hashRefreshToken(session.refreshToken));
      expect(row.tokenHash).not.toContain(session.refreshToken);
    });

    it.each([
      ['wrong password', { phone: '+8801712345678', password: 'nope' }],
      ['unknown phone', { phone: '+8801999999999', password: PASSWORD }],
      ['customer role', { phone: '+8801812345678', password: PASSWORD }],
    ])('rejects %s with the same error', async (_case, creds) => {
      await expect(service.login(creds)).rejects.toMatchObject({
        code: INVALID_CREDENTIALS,
        status: 401,
      });
    });

    it('rejects deactivated admins', async () => {
      owner().isActive = false;
      await expect(login()).rejects.toMatchObject({ code: INVALID_CREDENTIALS });
    });
  });

  describe('refresh rotation', () => {
    it('rotates: old token revoked and linked, new token in the same family', async () => {
      const first = await login();
      const second = await service.refresh({ refreshToken: first.refreshToken });

      expect(second.refreshToken).not.toBe(first.refreshToken);
      const rows = [...store.rows.values()];
      expect(rows).toHaveLength(2);
      const [old, next] = rows;
      expect(old).toMatchObject({ revokedReason: 'ROTATED', replacedById: next.id });
      expect(next.familyId).toBe(old.familyId);
      expect(store.active(old.familyId)).toHaveLength(1);
    });

    it('detects reuse of a rotated token and revokes the whole family', async () => {
      const first = await login();
      const second = await service.refresh({ refreshToken: first.refreshToken });

      await expect(service.refresh({ refreshToken: first.refreshToken })).rejects.toMatchObject({
        code: REFRESH_TOKEN_REUSED,
        status: 401,
      });
      // the legitimate latest token is now dead too
      await expect(service.refresh({ refreshToken: second.refreshToken })).rejects.toMatchObject({
        code: REFRESH_TOKEN_REUSED,
      });
      const familyId = [...store.rows.values()][0].familyId;
      expect(store.active(familyId)).toHaveLength(0);
    });

    it('rejects unknown and expired tokens', async () => {
      await expect(service.refresh({ refreshToken: 'garbage' })).rejects.toMatchObject({
        code: INVALID_REFRESH_TOKEN,
      });
      const session = await login();
      [...store.rows.values()][0].expiresAt = new Date(Date.now() - 1000);
      await expect(service.refresh({ refreshToken: session.refreshToken })).rejects.toMatchObject({
        code: INVALID_REFRESH_TOKEN,
      });
    });

    it('fails if a concurrent rotation already consumed the token', async () => {
      const session = await login();
      const original = store.markRotated.bind(store);
      jest.spyOn(store, 'markRotated').mockImplementationOnce(async (id, next, at) => {
        await original(id, 'someone-else', at); // the other request wins first
        return original(id, next, at);
      });
      await expect(service.refresh({ refreshToken: session.refreshToken })).rejects.toMatchObject({
        code: INVALID_REFRESH_TOKEN,
      } satisfies Partial<AppError>);
    });

    it('keeps separate logins as separate families', async () => {
      await login();
      await login();
      const families = new Set([...store.rows.values()].map((r) => r.familyId));
      expect(families.size).toBe(2);
    });
  });

  describe('logout', () => {
    it('revokes the family; later refresh fails', async () => {
      const session = await login();
      await service.logout(session.refreshToken);
      await expect(service.refresh({ refreshToken: session.refreshToken })).rejects.toMatchObject({
        code: REFRESH_TOKEN_REUSED,
      });
    });

    it('is idempotent for unknown tokens', async () => {
      await expect(service.logout('unknown')).resolves.toBeUndefined();
    });
  });
});
