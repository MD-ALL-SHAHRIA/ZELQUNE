import { type OutboxService } from '@zelqune/common';
import { type PasswordService } from '../auth/password.service';
import { type PrismaService } from '../prisma/prisma.service';
import { TeamService } from './team.service';

const OWNER = '00000000-0000-4000-8000-000000000001';
const STAFF = '00000000-0000-4000-8000-000000000002';
const user = (id: string, role: 'OWNER' | 'STAFF' | 'CUSTOMER') => ({
  id,
  phone: '+8801700000001',
  name: role,
  email: null,
  role,
  isActive: true,
  passwordHash: 'x',
  lastLoginAt: null,
  createdAt: new Date(0),
  updatedAt: new Date(0),
});

function service(rows: ReturnType<typeof user>[], activeOwners: number) {
  const tx = {
    user: {
      findUnique: ({ where }: { where: { phone: string } }) =>
        Promise.resolve(rows.find((r) => r.phone === where.phone) ?? null),
      create: jest.fn(),
      findFirst: ({ where }: { where: { id: string } }) =>
        Promise.resolve(rows.find((r) => r.id === where.id) ?? null),
      count: () => Promise.resolve(activeOwners),
      update: jest.fn(({ where, data }: { where: { id: string }; data: object }) =>
        Promise.resolve({ ...rows.find((r) => r.id === where.id)!, ...data }),
      ),
    },
    refreshToken: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    $executeRaw: jest.fn().mockResolvedValue(1),
  };
  const prisma = {
    $transaction: (fn: (t: typeof tx) => unknown) => fn(tx),
  } as unknown as PrismaService;
  const outbox = { add: jest.fn().mockResolvedValue(undefined) } as unknown as OutboxService;
  const passwords = { hash: () => Promise.resolve('hash') } as unknown as PasswordService;
  return { team: new TeamService(prisma, passwords, outbox), tx };
}

describe('TeamService', () => {
  it('never lets you lock yourself out', async () => {
    const { team } = service([user(OWNER, 'OWNER')], 2);
    await expect(team.update(OWNER, OWNER, { isActive: false })).rejects.toMatchObject({
      code: 'CANNOT_CHANGE_SELF',
    });
  });

  it('keeps at least one active owner', async () => {
    const other = '00000000-0000-4000-8000-000000000003';
    const { team } = service([user(other, 'OWNER')], 1);
    await expect(team.update(OWNER, other, { role: 'STAFF' })).rejects.toMatchObject({
      code: 'LAST_OWNER',
    });
  });

  it('signs a staff member out when their access is removed', async () => {
    const { team, tx } = service([user(STAFF, 'STAFF')], 1);
    const res = await team.update(OWNER, STAFF, { isActive: false });
    expect(res.isActive).toBe(false);
    expect(tx.refreshToken.updateMany).toHaveBeenCalled();
  });

  it('never turns an existing customer account into a team member', async () => {
    const customer = user('00000000-0000-4000-8000-000000000004', 'CUSTOMER');
    const { team, tx } = service([customer], 1);
    await expect(
      team.create({ phone: customer.phone, name: 'New staff', role: 'STAFF', password: 'long-enough-pass-9' }),
    ).rejects.toMatchObject({ code: 'PHONE_USED_BY_CUSTOMER', status: 409 });
    expect(tx.user.update).not.toHaveBeenCalled();
    expect(tx.user.create).not.toHaveBeenCalled();
  });
});
