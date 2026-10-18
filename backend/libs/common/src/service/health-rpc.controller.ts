import { Controller, Inject } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { type HealthPingResponse, RPC_PATTERNS, type ServiceName } from '@zelqune/contracts';

export const SERVICE_NAME = Symbol('SERVICE_NAME');

/** TCP liveness ping used by the gateway's /health. */
@Controller()
export class HealthRpcController {
  constructor(@Inject(SERVICE_NAME) private readonly serviceName: ServiceName) {}

  @MessagePattern(RPC_PATTERNS.health.ping)
  ping(): HealthPingResponse {
    return { service: this.serviceName, status: 'ok', uptimeSeconds: Math.round(process.uptime()) };
  }
}
