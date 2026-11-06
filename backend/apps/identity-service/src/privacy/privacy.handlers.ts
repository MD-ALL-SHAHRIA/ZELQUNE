import { Injectable, type OnModuleInit } from '@nestjs/common';
import { EventConsumer } from '@zelqune/common';
import { normalizeBdPhone, privacyErased } from '@zelqune/contracts';
import { type Prisma } from '../generated/prisma/client';

/**
 * Erasure (ADR 0020) also covers the customer account with that phone: personal data is
 * anonymised and every way to sign in is removed. The row (its id) stays, so retained orders
 * and financial records keep their reference. Dashboard accounts are never touched.
 */
@Injectable()
export class IdentityPrivacyHandlers implements OnModuleInit {
  constructor(private readonly consumer: EventConsumer) {}

  onModuleInit(): void {
    this.consumer.subscribe(privacyErased.type, 'identity.privacyErased', async (event, tx) => {
      const { phone } = privacyErased.parse(event).payload;
      await eraseCustomerAccount(tx as Prisma.TransactionClient, normalizeBdPhone(phone) ?? phone);
    });
  }
}

export async function eraseCustomerAccount(
  tx: Prisma.TransactionClient,
  phone: string,
): Promise<boolean> {
  const user = await tx.user.findUnique({ where: { phone } });
  if (!user || user.role !== 'CUSTOMER') return false;
  await tx.refreshToken.updateMany({
    where: { userId: user.id, revokedAt: null },
    data: { revokedAt: new Date(), revokedReason: 'LOGOUT' },
  });
  await tx.authToken.deleteMany({ where: { userId: user.id } });
  await tx.oAuthAccount.deleteMany({ where: { userId: user.id } });
  await tx.user.update({
    where: { id: user.id },
    data: {
      // phone is required and unique: a placeholder that can never match a real number
      phone: `erased:${user.id}`,
      name: null,
      email: null,
      passwordHash: null,
      emailVerifiedAt: null,
      signupContestedAt: null,
      isActive: false,
    },
  });
  return true;
}
