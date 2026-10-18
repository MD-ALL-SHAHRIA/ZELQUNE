import {
  type INestApplication,
  type INestApplicationContext,
  Logger as NestLogger,
  type Type,
} from '@nestjs/common';
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
  // Filters/interceptors registered on a hybrid app's microservice instance are not applied,
  // so the TCP transport inherits the app's globals instead. Both are context-aware:
  // AllExceptionsFilter answers rpc errors with an RpcErrorPayload, RpcContextInterceptor
  // passes HTTP through untouched. (Verified by test/integration.)
  app.useGlobalInterceptors(new RpcContextInterceptor());
  app.connectMicroservice<MicroserviceOptions>(
    { transport: Transport.TCP, options: { host: config.TCP_HOST, port: config.TCP_PORT } },
    { inheritAppConfig: true },
  );
}

export type ServiceCommand = (app: INestApplicationContext) => Promise<void>;

export interface ServiceBootstrapOptions {
  /** One-off commands run as `node main.js <command>` (e.g. `seed`), then the process exits. */
  commands?: Record<string, ServiceCommand>;
}

/** Runs a named command in an application context (no HTTP/TCP listeners). */
async function runCommand(module: Type, name: string, command: ServiceCommand): Promise<void> {
  const ctx = await NestFactory.createApplicationContext(module, { bufferLogs: true });
  ctx.useLogger(ctx.get(Logger));
  try {
    await command(ctx);
  } finally {
    await ctx.close();
  }
  new NestLogger('Bootstrap').log(`${name}: command finished`);
}

/** Boots an internal service: TCP microservice (gateway calls) + HTTP (only /health). */
export async function bootstrapService(
  module: Type,
  name: ServiceName,
  options: ServiceBootstrapOptions = {},
): Promise<void> {
  loadLocalEnv(name);
  const commandName = process.argv[2];
  if (commandName) {
    const command = options.commands?.[commandName];
    if (!command) {
      const available = Object.keys(options.commands ?? {}).join(', ') || 'none';
      throw new Error(`Unknown command "${commandName}" for ${name} (available: ${available})`);
    }
    return runCommand(module, `${name} ${commandName}`, command);
  }
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
