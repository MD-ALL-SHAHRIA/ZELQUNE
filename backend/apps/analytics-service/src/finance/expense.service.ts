import { Injectable } from '@nestjs/common';
import { AppError, currentActor, OutboxService, recordAudit } from '@zelqune/common';
import {
  type Expense,
  type ExpenseCategory,
  type ExpenseList,
  expenseListQuerySchema,
  resolveReportRange,
  upsertExpenseSchema,
  type UpsertExpenseInput,
} from '@zelqune/contracts';
import { type z } from 'zod';
import { type Expense as ExpenseRow } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const SOURCE = 'analytics-service';
const taka = (paisa: number) => `৳${(paisa / 100).toLocaleString('en-IN')}`;
const day = (iso: string) => new Date(`${iso}T00:00:00Z`);

/** The expense ledger behind profit and loss (ADR 0016). */
@Injectable()
export class ExpenseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
  ) {}

  async list(raw: z.input<typeof expenseListQuerySchema>): Promise<ExpenseList> {
    const query = expenseListQuerySchema.parse(raw ?? {});
    const range = resolveReportRange(query);
    if (!range)
      throw new AppError('INVALID_RANGE', 'from must be on or before to, at most 366 days', 422);
    const rows = await this.prisma.expense.findMany({
      where: {
        date: { gte: day(range.from), lte: day(range.to) },
        ...(query.category ? { category: query.category } : {}),
      },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      take: 2000,
    });
    const byCategory = new Map<ExpenseCategory, number>();
    for (const r of rows)
      byCategory.set(r.category, (byCategory.get(r.category) ?? 0) + r.amountPaisa);
    return {
      items: rows.map((r) => this.view(r)),
      totalPaisa: rows.reduce((sum, r) => sum + r.amountPaisa, 0),
      byCategory: [...byCategory.entries()]
        .map(([category, amountPaisa]) => ({ category, amountPaisa }))
        .sort((a, b) => b.amountPaisa - a.amountPaisa),
    };
  }

  async create(raw: UpsertExpenseInput): Promise<Expense> {
    const input = upsertExpenseSchema.parse(raw);
    const actor = currentActor();
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.expense.create({
        data: { ...input, date: day(input.date), createdBy: actor.id },
      });
      await recordAudit(this.outbox, tx, SOURCE, {
        action: 'expense.create',
        entityType: 'expense',
        entityId: row.id,
        summary: `Expense ${taka(row.amountPaisa)} (${row.category.toLowerCase()}): ${row.description}`,
        changes: { ...input },
      });
      return this.view(row);
    });
  }

  async update(id: string, raw: UpsertExpenseInput): Promise<Expense> {
    const input = upsertExpenseSchema.parse(raw);
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.expense.findUnique({ where: { id } });
      if (!before) throw new AppError('EXPENSE_NOT_FOUND', 'Expense not found', 404);
      const row = await tx.expense.update({
        where: { id },
        data: { ...input, date: day(input.date) },
      });
      await recordAudit(this.outbox, tx, SOURCE, {
        action: 'expense.update',
        entityType: 'expense',
        entityId: id,
        summary: `Expense updated: ${taka(row.amountPaisa)} ${row.description}`,
        changes: { ...input },
      });
      return this.view(row);
    });
  }

  async remove(id: string): Promise<{ deleted: boolean }> {
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.expense.findUnique({ where: { id } });
      if (!row) throw new AppError('EXPENSE_NOT_FOUND', 'Expense not found', 404);
      await tx.expense.delete({ where: { id } });
      await recordAudit(this.outbox, tx, SOURCE, {
        action: 'expense.delete',
        entityType: 'expense',
        entityId: id,
        summary: `Expense deleted: ${taka(row.amountPaisa)} ${row.description}`,
      });
      return { deleted: true };
    });
  }

  private view(r: ExpenseRow): Expense {
    return {
      id: r.id,
      date: r.date.toISOString().slice(0, 10),
      category: r.category,
      amountPaisa: r.amountPaisa,
      description: r.description,
      vendor: r.vendor,
      createdBy: r.createdBy,
      createdAt: r.createdAt.toISOString(),
    };
  }
}
