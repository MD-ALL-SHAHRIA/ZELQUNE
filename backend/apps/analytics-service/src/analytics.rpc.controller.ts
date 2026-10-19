import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  auditLogQuerySchema,
  type AuditLogPage,
  type BeaconEvent,
  dashboardQuerySchema,
  type DashboardStats,
  RPC_PATTERNS,
  type RpcRequest,
} from '@zelqune/contracts';
import { ProjectionsService } from './projections/projections.service';
import { StatsService } from './stats/stats.service';

const P = RPC_PATTERNS.analytics;

@Controller()
export class AnalyticsRpcController {
  constructor(
    private readonly projections: ProjectionsService,
    private readonly stats: StatsService,
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
}
