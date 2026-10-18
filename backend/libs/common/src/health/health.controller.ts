import { Controller, Get, Inject, Res, ServiceUnavailableException } from '@nestjs/common';
import {
  HealthCheck,
  type HealthCheckResult,
  HealthCheckService,
  type HealthIndicatorResult,
  HealthIndicatorService,
} from '@nestjs/terminus';
import { type Response } from 'express';
import { HEALTH_PROBES, type HealthProbe } from './health.types';

const PROBE_TIMEOUT_MS = 2000;

function withTimeout(promise: Promise<void>, ms: number): Promise<void> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly indicators: HealthIndicatorService,
    @Inject(HEALTH_PROBES) private readonly probes: HealthProbe[],
  ) {}

  @Get()
  @HealthCheck()
  async check(@Res({ passthrough: true }) res: Response): Promise<HealthCheckResult> {
    try {
      return await this.health.check(this.probes.map((probe) => () => this.run(probe)));
    } catch (err) {
      if (err instanceof ServiceUnavailableException) {
        res.status(503);
        return err.getResponse() as HealthCheckResult;
      }
      throw err;
    }
  }

  private async run(probe: HealthProbe): Promise<HealthIndicatorResult> {
    const indicator = this.indicators.check(probe.name);
    try {
      await withTimeout(probe.check(), PROBE_TIMEOUT_MS);
      return indicator.up();
    } catch (err) {
      return indicator.down({ message: err instanceof Error ? err.message : String(err) });
    }
  }
}
