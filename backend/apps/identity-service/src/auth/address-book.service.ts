import { Injectable } from '@nestjs/common';
import { AppError } from '@zelqune/common';
import {
  MAX_SAVED_ADDRESSES,
  type SavedAddress,
  savedAddressInputSchema,
  type SavedAddressList,
} from '@zelqune/contracts';
import { type CustomerAddress } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * A signed-in customer's saved delivery addresses. Every query is scoped to the token's user id,
 * so one customer can never see or change another's. Exactly one address is the default while
 * any exist: the first one saved, or the one last marked default.
 */
@Injectable()
export class AddressBookService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string): Promise<SavedAddressList> {
    const rows = await this.prisma.customerAddress.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
    });
    return { items: rows.map(view) };
  }

  /** Creates (id null) or replaces one of the customer's addresses; returns the whole book. */
  async save(userId: string, id: string | null, raw: unknown): Promise<SavedAddressList> {
    const input = savedAddressInputSchema.parse(raw);
    await this.prisma.$transaction(async (tx) => {
      const count = await tx.customerAddress.count({ where: { userId } });
      if (!id && count >= MAX_SAVED_ADDRESSES) {
        throw new AppError(
          'ADDRESS_LIMIT',
          `You can save up to ${MAX_SAVED_ADDRESSES} addresses`,
          422,
        );
      }
      const makeDefault = input.isDefault || count === 0;
      if (makeDefault) {
        await tx.customerAddress.updateMany({ where: { userId }, data: { isDefault: false } });
      }
      const data = { ...input, isDefault: makeDefault };
      if (!id) {
        await tx.customerAddress.create({ data: { ...data, userId } });
        return;
      }
      const { count: updated } = await tx.customerAddress.updateMany({
        where: { id, userId },
        data,
      });
      if (!updated) throw new AppError('ADDRESS_NOT_FOUND', 'Address not found', 404);
    });
    return this.list(userId);
  }

  /** Deletes one of the customer's addresses; the newest one left becomes the default. */
  async remove(userId: string, id: string): Promise<SavedAddressList> {
    await this.prisma.$transaction(async (tx) => {
      const gone = await tx.customerAddress.findFirst({ where: { id, userId } });
      if (!gone) throw new AppError('ADDRESS_NOT_FOUND', 'Address not found', 404);
      await tx.customerAddress.delete({ where: { id } });
      if (!gone.isDefault) return;
      const next = await tx.customerAddress.findFirst({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
      });
      if (next)
        await tx.customerAddress.update({ where: { id: next.id }, data: { isDefault: true } });
    });
    return this.list(userId);
  }
}

function view(a: CustomerAddress): SavedAddress {
  return {
    id: a.id,
    recipientName: a.recipientName,
    phone: a.phone,
    district: a.district,
    area: a.area,
    line: a.line,
    landmark: a.landmark,
    label: a.label === 'HOME' || a.label === 'OFFICE' ? a.label : null,
    isDefault: a.isDefault,
  };
}
