import { connect } from 'node:net';
import { IT } from './it-env';

function reachable(url: string, defaultPort: number): Promise<boolean> {
  const { hostname, port } = new URL(url);
  return new Promise((resolve) => {
    const socket = connect({ host: hostname, port: Number(port || defaultPort), timeout: 2000 });
    socket.once('connect', () => (socket.destroy(), resolve(true)));
    socket.once('timeout', () => (socket.destroy(), resolve(false)));
    socket.once('error', () => resolve(false));
  });
}

/** Fails in seconds (instead of hanging on reconnects) when the infrastructure is not running. */
export default async function preflight(): Promise<void> {
  const checks = await Promise.all([
    reachable(IT.pgAdminUrl, 5432).then((ok) => ['Postgres', IT.pgAdminUrl, ok] as const),
    reachable(IT.rabbitUrl, 5672).then((ok) => ['RabbitMQ', IT.rabbitUrl, ok] as const),
    reachable(IT.redisUrl, 6379).then((ok) => ['Redis', IT.redisUrl, ok] as const),
  ]);
  const down = checks
    .filter(([, , ok]) => !ok)
    .map(([name, url]) => `${name} (${new URL(url).host})`);
  if (down.length > 0) {
    throw new Error(
      `Integration tests need running infrastructure; not reachable: ${down.join(', ')}.\nRun: pnpm infra:up  (or: docker compose -f infra/docker-compose.yml up -d postgres rabbitmq redis)`,
    );
  }
}
