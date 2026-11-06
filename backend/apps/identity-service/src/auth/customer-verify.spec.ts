import { type PrismaService } from '../prisma/prisma.service';
import { type AuthService } from './auth.service';
import { CustomerService } from './customer.service';
import { type PasswordService } from './password.service';
import { type TokenService } from './token.service';

const TOKEN = 'x'.repeat(43);

/** An unverified account whose password was typed at sign-up, maybe by a stranger. */
function setup() {
  const row = {
    id: '00000000-0000-4000-8000-0000000000aa',
    email: 'owner@example.com',
    phone: '+8801711111111',
    name: 'Someone',
    role: 'CUSTOMER' as const,
    isActive: true,
    passwordHash: 'signup-hash' as string | null,
    emailVerifiedAt: null as Date | null,
  };
  const tx = {
    user: {
      findUnique: jest.fn(() => Promise.resolve(row)),
      create: jest.fn(({ data }: { data: typeof row }) => Promise.resolve({ ...row, ...data })),
      update: jest.fn(({ data }: { data: Partial<typeof row> }) =>
        Promise.resolve(Object.assign(row, data)),
      ),
    },
    authToken: {
      findUnique: jest.fn(() =>
        Promise.resolve({
          id: 't1',
          purpose: 'VERIFY_EMAIL',
          expiresAt: new Date(Date.now() + 60_000),
          user: { ...row },
        }),
      ),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      create: jest.fn().mockResolvedValue({}),
    },
    refreshToken: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
    oAuthAccount: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
  };
  const prisma = {
    ...tx,
    $transaction: (arg: unknown) =>
      typeof arg === 'function' ? (arg as (t: typeof tx) => unknown)(tx) : Promise.all(arg as []),
  } as unknown as PrismaService;
  const auth = { openSession: jest.fn().mockResolvedValue({}) } as unknown as AuthService;
  const passwords = {
    hash: (p: string) => Promise.resolve(`hash(${p})`),
  } as unknown as PasswordService;
  return { service: new CustomerService(prisma, auth, passwords, {} as TokenService), row, tx };
}

describe('email verification sets the password (pre-registration)', () => {
  const meta = { ip: '1', userAgent: 'x' } as never;

  it('refuses to verify without a new password', async () => {
    const { service, row } = setup();
    await expect(service.verifyEmail({ token: TOKEN }, meta)).rejects.toThrow();
    expect(row.emailVerifiedAt).toBeNull();
  });

  it('discards the sign-up password and ends other sessions', async () => {
    const { service, row, tx } = setup();
    await service.verifyEmail({ token: TOKEN, password: 'teak-lamp-quiet-river-91' }, meta);
    expect(row.passwordHash).toBe('hash(teak-lamp-quiet-river-91)');
    expect(row.emailVerifiedAt).toBeInstanceOf(Date);
    expect(tx.refreshToken.updateMany).toHaveBeenCalled();
    expect(tx.oAuthAccount.deleteMany).toHaveBeenCalled();
  });

  it('never stores the password typed at sign-up', async () => {
    const { service, tx } = setup();
    tx.user.findUnique.mockResolvedValueOnce(null as never);
    await service.register({
      name: 'New Person',
      email: 'new@example.com',
      phone: '01722222222',
      password: 'a-very-long-unique-passphrase-71',
      lang: 'en',
    });
    expect(tx.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ passwordHash: null }),
    });
  });
});
