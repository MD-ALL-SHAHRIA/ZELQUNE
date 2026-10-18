import { type INestApplication, Logger as NestLogger, type Type } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { type MicroserviceOptions, Transport } from '@nestjs/microservices';
import { type ServiceName } from '@zelqune/contracts';
import { Logger } from 'nestjs-pino';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseEnv as parseDotenv } from 'node:util';
import { APP_CONFIG } from '../config/config.module';
import { type ServiceEnv } from '../config/env';
import { AllExceptionsFilter } from '../errors/all-exceptions.filter';
import { requestIdMiddleware } from '../http/request-id';
import { RpcContextInterceptor } from '../rpc/rpc-context.interceptor';

/** Loads `apps/<app>/.env` for local runs without overriding real env (absent in containers). */
export function loadLocalEnv(appName: string): void {
  const file = join(process.cwd(), 'apps', appName, '.env');
  if (!existsSync(file)) return;
  for (const [key, value] of Object.entries(parseDotenv(readFileSync(file, 'utf8')))) {
    process.env[key] ??= value;
  }
}

/** Shared HTTP setup for gateway and services. */
export function configureHttpApp(app: INestApplication): void {
  app.useLogger(app.get(Logger));
  app.use(requestIdMiddleware);
  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableShutdownHooks();
}

/** Attaches the private TCP transport to a service app. */
export function connectTcpTransport(app: INestApplication, config: ServiceEnv): void {
  const microservice = app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: { host: config.TCP_HOST, port: config.TCP_PORT },
  });
  microservice.useGlobalFilters(new AllExceptionsFilter());
  microservice.useGlobalInterceptors(new RpcContextInterceptor());
}

/** Boots an internal service: TCP microservice (gateway calls) + HTTP (only /health). */
export async function bootstrapService(module: Type, name: ServiceName): Promise<void> {
  loadLocalEnv(name);
  const app = await NestFactory.create(module, { bufferLogs: true });
  configureHttpApp(app);
  const config = app.get<ServiceEnv>(APP_CONFIG);
  connectTcpTransport(app, config);
  await app.startAllMicroservices();
  await app.listen(config.HTTP_PORT, '0.0.0.0');
  new NestLogger('Bootstrap').log(
    `${name} up: tcp ${config.TCP_HOST}:${config.TCP_PORT}, http :${config.HTTP_PORT}/health`,
  );
}
