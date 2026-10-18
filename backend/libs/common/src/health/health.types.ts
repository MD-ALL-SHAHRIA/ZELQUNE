import { type SqlExecutor } from '../db/db.types';

/** A named dependency check; resolve = up, reject = down. */
export interface HealthProbe {
  name: string;
  check(): Promise<void>;
}

export const HEALTH_PROBES = Symbol('HEALTH_PROBES');

export function databaseProbe(db: SqlExecutor): HealthProbe {
  return {
    name: 'database',
    check: async () => {
      await db.$queryRaw`SELECT 1`;
    },
  };
}
