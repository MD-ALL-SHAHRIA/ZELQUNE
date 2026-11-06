import { type Prisma } from '../generated/prisma/client';
import { eraseCustomerAccount } from './privacy.handlers';

function tx(role: 'CUSTOMER' | 'OWNER') {
  return {
    user: {
      findUnique: jest.fn().mockResolvedValue({ id: 'u1', role, phone: '+8801712345678' }),
      update: jest.fn().mockResolvedValue({}),
    },
    refreshToken: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    authToken: { deleteMany: jest.fn().mockResolvedValue({ count: 1 }) },
    oAuthAccount: { deleteMany: jest.fn().mockResolvedValue({ count: 1 }) },
  };
}

describe('privacy erasure of customer accounts', () => {
  it('anonymises the customer and removes every way to sign in, keeping the row id', async () => {
    const t = tx('CUSTOMER');
    await expect(
      eraseCustomerAccount(t as unknown as Prisma.TransactionClient, '+8801712345678'),
    ).resolves.toBe(true);
    expect(t.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: expect.objectContaining({
        phone: 'erased:u1',
        name: null,
        email: null,
        passwordHash: null,
        isActive: false,
      }),
    });
    expect(t.refreshToken.updateMany).toHaveBeenCalled();
    expect(t.authToken.deleteMany).toHaveBeenCalled();
    expect(t.oAuthAccount.deleteMany).toHaveBeenCalled();
  });

  it('never touches dashboard accounts', async () => {
    const t = tx('OWNER');
    await expect(
      eraseCustomerAccount(t as unknown as Prisma.TransactionClient, '+8801712345678'),
    ).resolves.toBe(false);
    expect(t.user.update).not.toHaveBeenCalled();
  });
});
