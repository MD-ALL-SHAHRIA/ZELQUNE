/**
 * The minimal raw-SQL surface libs/common needs from a service's Prisma client (or its
 * transaction client). Each service's PrismaService satisfies TransactionalDb structurally,
 * so shared code never depends on a specific service's generated client.
 * Unqualified table names resolve to the service's own schema via the role's search_path.
 */
export interface SqlExecutor {
  $executeRaw(query: TemplateStringsArray, ...values: unknown[]): PromiseLike<number>;
  $queryRaw<T = unknown>(query: TemplateStringsArray, ...values: unknown[]): PromiseLike<T>;
}

export interface TransactionalDb extends SqlExecutor {
  transaction<T>(fn: (tx: SqlExecutor) => Promise<T>): Promise<T>;
}

export const TRANSACTIONAL_DB = Symbol('TRANSACTIONAL_DB');
