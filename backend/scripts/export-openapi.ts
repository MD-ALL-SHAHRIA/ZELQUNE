/**
 * Writes the gateway OpenAPI spec to a file without Redis or running services
 * (dependencies are stubbed). Usage: pnpm openapi:export  (from backend/) or pnpm gen:api (root).
 */
import { Test } from '@nestjs/testing';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { AppModule } from '../apps/gateway/src/app.module';
import { REDIS } from '../apps/gateway/src/redis/redis.module';
import { ServiceRegistry } from '../apps/gateway/src/services/service-registry';
import { createOpenApiDocument, setupGateway } from '../apps/gateway/src/setup';

async function main(): Promise<void> {
  const out = resolve(process.argv[2] ?? 'openapi.json');
  process.env.REDIS_URL ??= 'redis://localhost:6379';
  process.env.LOG_LEVEL ??= 'silent';

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(REDIS)
    .useValue({ quit: () => Promise.resolve('OK') })
    .overrideProvider(ServiceRegistry)
    .useValue({ all: () => [], onApplicationShutdown: () => undefined })
    .compile();
  const app = moduleRef.createNestApplication({ logger: false });
  setupGateway(app, { CORS_ORIGINS: [] });
  await app.init();

  writeFileSync(out, `${JSON.stringify(createOpenApiDocument(app), null, 2)}\n`);
  await app.close();
  console.log(`OpenAPI spec written to ${out}`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
