import { type INestApplication, RequestMethod } from '@nestjs/common';
import { type NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, type OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import {
  CART_TOKEN_HEADER,
  configureHttpApp,
  finalizeOpenApiDocument,
  IDEMPOTENCY_HEADER,
  REQUEST_ID_HEADER,
} from '@zelqune/common';
import cookieParser from 'cookie-parser';
import { type GatewayEnv } from './config/gateway-env';
import { TURNSTILE_HEADER } from './turnstile/turnstile';

export const API_PREFIX = 'v1';

/** Everything main.ts applies, shared with e2e tests. */
export function setupGateway(
  app: INestApplication,
  config: Pick<GatewayEnv, 'CORS_ORIGINS' | 'TRUST_PROXY'>,
): void {
  // Correct client IPs (rate limits, session metadata) behind the reverse proxy.
  (app as NestExpressApplication).set('trust proxy', config.TRUST_PROXY);
  app.use(cookieParser());
  configureHttpApp(app);
  app.setGlobalPrefix(API_PREFIX, { exclude: [{ path: 'health', method: RequestMethod.GET }] });
  app.enableCors({
    origin: config.CORS_ORIGINS,
    credentials: true,
    exposedHeaders: [REQUEST_ID_HEADER, 'idempotency-replayed'],
    // The storefront calls the gateway from the browser, so its cart and Turnstile headers
    // must pass the preflight.
    allowedHeaders: [
      'content-type',
      'authorization',
      REQUEST_ID_HEADER,
      IDEMPOTENCY_HEADER,
      CART_TOKEN_HEADER,
      TURNSTILE_HEADER,
    ],
  });

  // UI at /docs, spec at /docs-json (packages/api-client generates types from it).
  SwaggerModule.setup('docs', app, createOpenApiDocument(app), { jsonDocumentUrl: 'docs-json' });
}

export function createOpenApiDocument(app: INestApplication): OpenAPIObject {
  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Zelqune API')
      .setDescription('Public REST API (gateway). Money values are integer paisa.')
      .setVersion('0.1.0')
      .addBearerAuth()
      .build(),
  );
  return finalizeOpenApiDocument(document);
}
