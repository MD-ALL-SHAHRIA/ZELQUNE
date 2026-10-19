import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { Client } from 'pg';
import { IT, SCHEMA_APPS, type SchemaName, serviceDbUrl } from './it-env';

/**
 * A fresh database per spec file with the production layout: one schema + one
 * least-privilege role per service (ADR 0003), then each service's real migrations.
 */
export async function prepareDatabase(
  database: string,
  schemas = Object.keys(SCHEMA_APPS) as SchemaName[],
): Promise<string> {
  if (!/^[a-z_]+$/.test(database)) throw new Error(`bad database name ${database}`);
  const admin = new Client({ connectionString: IT.pgAdminUrl });
  await admin.connect();
  try {
    await admin.query(`DROP DATABASE IF EXISTS ${database} WITH (FORCE)`);
    await admin.query(`CREATE DATABASE ${database}`);
    for (const schema of schemas) {
      const role = `${schema}_svc`;
      const exists = await admin.query('SELECT 1 FROM pg_roles WHERE rolname = $1', [role]);
      if (exists.rowCount === 0) {
        await admin.query(
          `CREATE ROLE ${role} LOGIN PASSWORD '${IT.serviceDbPassword.replace(/'/g, "''")}'`,
        );
        await admin.query(`ALTER ROLE ${role} SET search_path = ${schema}`);
      }
      await admin.query(`GRANT CONNECT ON DATABASE ${database} TO ${role}`);
    }
    await admin.query(`REVOKE ALL ON DATABASE ${database} FROM PUBLIC`);
  } finally {
    await admin.end();
  }

  const db = new Client({
    connectionString: IT.pgAdminUrl.replace(/\/[^/?]+(\?|$)/, `/${database}$1`),
  });
  await db.connect();
  try {
    await db.query('REVOKE ALL ON SCHEMA public FROM PUBLIC');
    for (const schema of schemas)
      await db.query(`CREATE SCHEMA ${schema} AUTHORIZATION ${schema}_svc`);
  } finally {
    await db.end();
  }

  const backendRoot = resolve(__dirname, '../..');
  for (const schema of schemas) {
    execFileSync(
      'pnpm',
      [
        'exec',
        'prisma',
        'migrate',
        'deploy',
        '--config',
        `apps/${SCHEMA_APPS[schema]}/prisma.config.ts`,
      ],
      {
        cwd: backendRoot,
        env: {
          ...process.env,
          DATABASE_URL: serviceDbUrl(schema, database),
          PRISMA_HIDE_UPDATE_MESSAGE: '1',
          PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK: '1',
        },
        stdio: 'pipe',
      },
    );
  }
  return database;
}
