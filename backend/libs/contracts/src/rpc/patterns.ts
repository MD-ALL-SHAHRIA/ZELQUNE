import { type ServiceName } from '../services';

/** TCP message patterns shared by gateway and services. */
export const RPC_PATTERNS = {
  health: { ping: 'health.ping' },
} as const;

export interface HealthPingResponse {
  service: ServiceName;
  status: 'ok';
  uptimeSeconds: number;
}
