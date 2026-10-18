import { type SqlExecutor, type TransactionalDb } from '../db/db.types';

export interface RecordedQuery {
  sql: string;
  values: unknown[];
}

/** Records raw SQL and returns queued results; for unit-testing code built on TransactionalDb. */
export class FakeSql implements TransactionalDb {
  readonly queries: RecordedQuery[] = [];
  readonly queryResults: unknown[][] = [];
  readonly executeResults: number[] = [];
  commits = 0;
  rollbacks = 0;

  $executeRaw(query: TemplateStringsArray, ...values: unknown[]): Promise<number> {
    this.record(query, values);
    return Promise.resolve(this.executeResults.shift() ?? 1);
  }

  $queryRaw<T = unknown>(query: TemplateStringsArray, ...values: unknown[]): Promise<T> {
    this.record(query, values);
    return Promise.resolve((this.queryResults.shift() ?? []) as T);
  }

  async transaction<T>(fn: (tx: SqlExecutor) => Promise<T>): Promise<T> {
    try {
      const result = await fn(this);
      this.commits++;
      return result;
    } catch (err) {
      this.rollbacks++;
      throw err;
    }
  }

  sqlStartingWith(prefix: string): RecordedQuery[] {
    return this.queries.filter((q) => q.sql.startsWith(prefix));
  }

  private record(query: TemplateStringsArray, values: unknown[]): void {
    this.queries.push({ sql: query.join('?').replace(/\s+/g, ' ').trim(), values });
  }
}
