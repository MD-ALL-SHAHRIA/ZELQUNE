import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { Client } from 'pg';
import { IT, SCHEMAS, serviceDbUrl } from './it-env';

/**
 * Fresh database `zelqune_it` with the same layout as production: one schema + one
 * least-privilege role per service (ADR 0003), then each service's real migrations.
 */
export default async function globalSetup(): Promise<void> {
  const admin = new Client({ connectionString: IT.pgAdminUrl });
  await admin.connect();
  try {
    await admin.query(`DROP DATABASE IF EXISTS ${IT.database} WITH (FORCE)`);
    await admin.query(`CREATE DATABASE ${IT.database}`);
    for (const schema of Object.values(SCHEMAS)) {
      const role = `${schema}_svc`;
      const exists = await admin.query('SELECT 1 FROM pg_roles WHERE rolname = $1', [role]);
      if (exists.rowCount === 0) {
        await admin.query(
          `CREATE ROLE ${role} LOGIN PASSWORD '${IT.serviceDbPassword.replace(/'/g, "''")}'`,
        );
        await admin.query(`ALTER ROLE ${role} SET search_path = ${schema}`);
      }
      await admin.query(`GRANT CONNECT ON DATABASE ${IT.database} TO ${role}`);
    }
    await admin.query(`REVOKE ALL ON DATABASE ${IT.database} FROM PUBLIC`);
  } finally {
    await admin.end();
  }

  const db = new Client({
    connectionString: IT.pgAdminUrl.replace(/\/[^/?]+(\?|$)/, `/${IT.database}$1`),
  });
  await db.connect();
  try {
    await db.query('REVOKE ALL ON SCHEMA public FROM PUBLIC');
    for (const schema of Object.values(SCHEMAS)) {
      await db.query(`CREATE SCHEMA ${schema} AUTHORIZATION ${schema}_svc`);
    }
  } finally {
    await db.end();
  }

  const backendRoot = resolve(__dirname, '../..');
  for (const [schema, app] of [
    [SCHEMAS.identity, 'identity-service'],
    [SCHEMAS.catalog, 'catalog-service'],
  ] as const) {
    execFileSync(
      'pnpm',
      ['exec', 'prisma', 'migrate', 'deploy', '--config', `apps/${app}/prisma.config.ts`],
      {
        cwd: backendRoot,
        env: {
          ...process.env,
          DATABASE_URL: serviceDbUrl(schema),
          PRISMA_HIDE_UPDATE_MESSAGE: '1',
        },
        stdio: 'pipe',
      },
    );
  }
}
