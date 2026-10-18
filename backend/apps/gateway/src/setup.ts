import { type INestApplication, RequestMethod } from '@nestjs/common';
import { DocumentBuilder, type OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import { configureHttpApp, IDEMPOTENCY_HEADER, REQUEST_ID_HEADER } from '@zelqune/common';
import { type GatewayEnv } from './config/gateway-env';

export const API_PREFIX = 'v1';

/** Everything main.ts applies, shared with e2e tests. */
export function setupGateway(
  app: INestApplication,
  config: Pick<GatewayEnv, 'CORS_ORIGINS'>,
): void {
  configureHttpApp(app);
  app.setGlobalPrefix(API_PREFIX, { exclude: [{ path: 'health', method: RequestMethod.GET }] });
  app.enableCors({
    origin: config.CORS_ORIGINS,
    credentials: true,
    exposedHeaders: [REQUEST_ID_HEADER, 'idempotency-replayed'],
    allowedHeaders: ['content-type', 'authorization', REQUEST_ID_HEADER, IDEMPOTENCY_HEADER],
  });

  // UI at /docs, spec at /docs-json (packages/api-client generates types from it).
  SwaggerModule.setup('docs', app, createOpenApiDocument(app), { jsonDocumentUrl: 'docs-json' });
}

export function createOpenApiDocument(app: INestApplication): OpenAPIObject {
  return SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Zelqune API')
      .setDescription('Public REST API (gateway). Money values are integer paisa.')
      .setVersion('0.1.0')
      .addBearerAuth()
      .build(),
  );
}
