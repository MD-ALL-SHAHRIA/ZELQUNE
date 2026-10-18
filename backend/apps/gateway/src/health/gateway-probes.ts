import { type HealthProbe } from '@zelqune/common';
import { type HealthPingResponse, RPC_PATTERNS } from '@zelqune/contracts';
import { type Redis } from 'ioredis';
import { type ServiceRegistry } from '../services/service-registry';

const PING_TIMEOUT_MS = 1500;

export function gatewayProbes(redis: Redis, registry: ServiceRegistry): HealthProbe[] {
  return [
    {
      name: 'redis',
      check: async () => {
        await redis.ping();
      },
    },
    ...registry.all().map(
      (client): HealthProbe => ({
        name: client.name,
        check: async () => {
          await client.send<HealthPingResponse>(RPC_PATTERNS.health.ping, {}, { timeoutMs: PING_TIMEOUT_MS });
        },
      }),
    ),
  ];
}
