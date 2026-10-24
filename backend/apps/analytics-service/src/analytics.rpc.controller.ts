import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  auditLogQuerySchema,
  type AuditLogPage,
  type BeaconEvent,
  dashboardQuerySchema,
  type DashboardStats,
  type Expense,
  type ExpenseList,
  type UpsertExpenseInput,
  RPC_PATTERNS,
  type RpcRequest,
} from '@zelqune/contracts';
import { z } from 'zod';
import { ExpenseService } from './finance/expense.service';
import { ProjectionsService } from './projections/projections.service';
import { StatsService } from './stats/stats.service';

const P = RPC_PATTERNS.analytics;

@Controller()
export class AnalyticsRpcController {
  constructor(
    private readonly projections: ProjectionsService,
    private readonly stats: StatsService,
    private readonly expenses: ExpenseService,
  ) {}

  @MessagePattern(P.track)
  track(@Payload() req: RpcRequest<BeaconEvent>): Promise<{ ok: true }> {
    return this.projections.track(req.data);
  }

  @MessagePattern(P.dashboard)
  dashboard(@Payload() req: RpcRequest<unknown>): Promise<DashboardStats> {
    return this.stats.dashboard(dashboardQuerySchema.parse(req.data ?? {}));
  }

  @MessagePattern(P.auditLog)
  auditLog(@Payload() req: RpcRequest<unknown>): Promise<AuditLogPage> {
    return this.stats.auditLog(auditLogQuerySchema.parse(req.data ?? {}));
  }

  @MessagePattern(P.listExpenses)
  listExpenses(@Payload() req: RpcRequest<Record<string, string>>): Promise<ExpenseList> {
    return this.expenses.list(req.data ?? {});
  }

  @MessagePattern(P.createExpense)
  createExpense(@Payload() req: RpcRequest<UpsertExpenseInput>): Promise<Expense> {
    return this.expenses.create(req.data);
  }

  @MessagePattern(P.updateExpense)
  updateExpense(
    @Payload() req: RpcRequest<{ id: string; expense: UpsertExpenseInput }>,
  ): Promise<Expense> {
    return this.expenses.update(z.uuid().parse(req.data.id), req.data.expense);
  }

  @MessagePattern(P.removeExpense)
  removeExpense(@Payload() req: RpcRequest<{ id: string }>): Promise<{ deleted: boolean }> {
    return this.expenses.remove(z.uuid().parse(req.data.id));
  }
}
