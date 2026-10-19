import { Global, Inject, Injectable, Module, type OnApplicationShutdown } from '@nestjs/common';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { SERVICE_KEYS, SERVICES, type ServiceKey } from '@zelqune/contracts';
import { z } from 'zod';
import { APP_CONFIG } from '../config/config.module';
import { ServiceClient } from './service-client';

const DEFAULT_TCP_PORTS: Record<ServiceKey, number> = {
  identity: 4001,
  catalog: 4002,
  inventory: 4003,
  order: 4004,
  payment: 4005,
  shipping: 4006,
  notification: 4007,
  analytics: 4008,
};

/** e.g. identity -> IDENTITY_SERVICE (env IDENTITY_SERVICE_HOST / IDENTITY_SERVICE_PORT) */
export function serviceEnvPrefix(key: ServiceKey): string {
  return SERVICES[key].name.replace(/-/g, '_').toUpperCase();
}

/** Env shape for calling other services over TCP; merge into an app's env schema. */
export const serviceAddressEnvShape = {
  RPC_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),
  ...(Object.fromEntries(
    SERVICE_KEYS.flatMap((key) => [
      [`${serviceEnvPrefix(key)}_HOST`, z.string().min(1).default('localhost')],
      [
        `${serviceEnvPrefix(key)}_PORT`,
        z.coerce.number().int().positive().default(DEFAULT_TCP_PORTS[key]),
      ],
    ]),
  ) as Record<string, z.ZodDefault<z.ZodString> | z.ZodDefault<z.ZodCoercedNumber>>),
};

type AddressConfig = { RPC_TIMEOUT_MS: number } & Record<string, unknown>;

export function serviceAddress(
  config: AddressConfig,
  key: ServiceKey,
): { host: string; port: number } {
  const prefix = serviceEnvPrefix(key);
  return { host: String(config[`${prefix}_HOST`]), port: Number(config[`${prefix}_PORT`]) };
}

/** One lazily-connecting TCP client per internal service. */
@Injectable()
export class ServiceRegistry implements OnApplicationShutdown {
  private readonly clients: Map<ServiceKey, ServiceClient>;

  constructor(@Inject(APP_CONFIG) config: AddressConfig) {
    this.clients = new Map(
      SERVICE_KEYS.map((key) => [
        key,
        new ServiceClient(
          SERVICES[key].name,
          ClientProxyFactory.create({
            transport: Transport.TCP,
            options: serviceAddress(config, key),
          }),
          config.RPC_TIMEOUT_MS,
        ),
      ]),
    );
  }

  get(key: ServiceKey): ServiceClient {
    const client = this.clients.get(key);
    if (!client) throw new Error(`Unknown service ${key}`);
    return client;
  }

  all(): ServiceClient[] {
    return [...this.clients.values()];
  }

  async onApplicationShutdown(): Promise<void> {
    await Promise.all(this.all().map((client) => client.close()));
  }
}

/** Provides ServiceRegistry globally (gateway, and saga orchestrators such as order-service). */
@Global()
@Module({ providers: [ServiceRegistry], exports: [ServiceRegistry] })
export class ServiceClientsModule {}
