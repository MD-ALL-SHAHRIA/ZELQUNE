import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
} from '@nestjs/common';
import { APP_CONFIG, type ServiceEnv } from '@zelqune/common';
import { PrismaService } from '../prisma/prisma.service';

/** Raw storefront visit events are kept this long; order facts and other aggregates stay. */
export const TRACKED_EVENTS_RETENTION_DAYS = 90;
const SWEEP_INTERVAL_MS = 6 * 3_600_000;
const DELETE_BATCH = 5_000;

/** Deletes raw tracked_events older than the retention period, in small batches. */
@Injectable()
export class RetentionService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(RetentionService.name);
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(APP_CONFIG) private readonly config: ServiceEnv,
  ) {}

  onApplicationBootstrap(): void {
    if (this.config.NODE_ENV === 'test') return;
    this.timer = setInterval(() => void this.sweepSafely(), SWEEP_INTERVAL_MS);
    void this.sweepSafely();
  }

  onModuleDestroy(): void {
    clearInterval(this.timer);
  }

  /** Returns how many rows were deleted. */
  async deleteExpired(now = new Date()): Promise<number> {
    const cutoff = new Date(now.getTime() - TRACKED_EVENTS_RETENTION_DAYS * 86_400_000);
    let total = 0;
    for (;;) {
      const deleted = await this.prisma.$executeRaw`
        DELETE FROM tracked_events WHERE id IN (
          SELECT id FROM tracked_events WHERE occurred_at < ${cutoff} LIMIT ${DELETE_BATCH})`;
      total += deleted;
      if (deleted < DELETE_BATCH) return total;
    }
  }

  private async sweepSafely(): Promise<void> {
    try {
      const n = await this.deleteExpired();
      if (n > 0) this.logger.log(`Deleted ${n} tracked event(s) older than ${TRACKED_EVENTS_RETENTION_DAYS} days`);
    } catch (err) {
      this.logger.error({ err }, 'Tracked events retention sweep failed');
    }
  }
}
