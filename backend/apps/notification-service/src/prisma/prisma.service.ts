import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  InjectConfig,
  type ServiceEnv,
  type SqlExecutor,
  type TransactionalDb,
} from '@zelqune/common';
import { PrismaClient } from '../generated/prisma/client';

/** Client for the `notifications` schema only (the DB role cannot see other schemas). */
@Injectable()
export class PrismaService extends PrismaClient implements TransactionalDb, OnModuleDestroy {
  constructor(@InjectConfig() config: ServiceEnv) {
    super({
      adapter: new PrismaPg(
        { connectionString: config.DATABASE_URL },
        { schema: config.DB_SCHEMA },
      ),
    });
  }

  /** Handlers call the SMS gateway inside this transaction: allow a slow one (Prisma's default is 5 s). */
  transaction<T>(fn: (tx: SqlExecutor) => Promise<T>): Promise<T> {
    return this.$transaction((tx) => fn(tx), { maxWait: 5_000, timeout: 30_000 });
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
