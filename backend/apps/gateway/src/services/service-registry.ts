import { Inject, Injectable, type OnApplicationShutdown } from '@nestjs/common';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { APP_CONFIG, ServiceClient } from '@zelqune/common';
import { SERVICE_KEYS, SERVICES, type ServiceKey } from '@zelqune/contracts';
import { type GatewayEnv, serviceAddress } from '../config/gateway-env';

/** One lazily-connecting TCP client per internal service. */
@Injectable()
export class ServiceRegistry implements OnApplicationShutdown {
  private readonly clients: Map<ServiceKey, ServiceClient>;

  constructor(@Inject(APP_CONFIG) config: GatewayEnv) {
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
