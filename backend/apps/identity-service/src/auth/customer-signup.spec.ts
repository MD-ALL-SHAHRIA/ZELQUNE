import { type PrismaService } from '../prisma/prisma.service';
import { type AuthService } from './auth.service';
import { CustomerService } from './customer.service';
import { type PasswordService } from './password.service';
import { type TokenService } from './token.service';

const attackerRow = {
  id: '00000000-0000-4000-8000-0000000000aa',
  email: 'victim@example.com',
  phone: '+8801711111111',
  name: 'Attacker',
  role: 'CUSTOMER' as const,
  isActive: true,
  passwordHash: 'attacker-hash',
  emailVerifiedAt: null as Date | null,
  signupContestedAt: null as Date | null,
};

function setup() {
  const row = { ...attackerRow };
  const tx = {
    user: {
      findUnique: jest.fn(() => Promise.resolve(row)),
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
  const auth = {
    openSession: jest.fn().mockResolvedValue({ accessToken: 'a', refreshToken: 'r' }),
  } as unknown as AuthService;
  const passwords = { hash: () => Promise.resolve('victim-hash') } as unknown as PasswordService;
  const service = new CustomerService(prisma, auth, passwords, {} as TokenService);
  return { service, row, tx };
}

describe('customer sign-up pre-registration (ID-SEC-2)', () => {
  it('a second sign-up for an unverified email resets credentials when the inbox owner verifies', async () => {
    const { service, row, tx } = setup();

    const { mail } = await service.register({
      name: 'Real Owner',
      email: 'victim@example.com',
      phone: '01722222222',
      password: 'a-very-long-unique-passphrase-71',
      lang: 'en',
    });
    expect(row.signupContestedAt).toBeInstanceOf(Date);
    expect(row.passwordHash).toBe('attacker-hash'); // never overwritten by an unverified sign-up

    await service.verifyEmail(
      { token: (mail as { token: string }).token },
      { ip: '1', userAgent: 'x' },
    );
    expect(row.passwordHash).toBeNull(); // the stranger's password no longer works
    expect(row.emailVerifiedAt).toBeInstanceOf(Date);
    expect(row.signupContestedAt).toBeNull();
    expect(tx.refreshToken.updateMany).toHaveBeenCalled();
    expect(tx.oAuthAccount.deleteMany).toHaveBeenCalled();
  });

  it('an uncontested verification keeps the password chosen at sign-up', async () => {
    const { service, row } = setup();
    await service.verifyEmail({ token: 'x'.repeat(43) }, { ip: '1', userAgent: 'x' });
    expect(row.passwordHash).toBe('attacker-hash');
    expect(row.emailVerifiedAt).toBeInstanceOf(Date);
  });
});
