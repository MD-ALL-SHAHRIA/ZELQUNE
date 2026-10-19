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
  if (down.length === 0) await ensureVhost();
  if (down.length > 0) {
    throw new Error(
      `Integration tests need running infrastructure; not reachable: ${down.join(', ')}.\nRun: pnpm infra:up  (or: docker compose -f infra/docker-compose.yml up -d postgres rabbitmq redis)`,
    );
  }
}

/** Creates the test vhost (idempotent) and grants the broker user full rights on it. */
async function ensureVhost(): Promise<void> {
  const amqp = new URL(IT.rabbitUrl);
  const vhost = decodeURIComponent(amqp.pathname.replace(/^\//, '')) || '/';
  if (vhost === '/') return;
  const auth = `Basic ${Buffer.from(`${decodeURIComponent(amqp.username)}:${decodeURIComponent(amqp.password)}`).toString('base64')}`;
  const api = (path: string, body: object) =>
    fetch(`${IT.rabbitManagementUrl}/api/${path}`, {
      method: 'PUT',
      headers: { authorization: auth, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  const v = encodeURIComponent(vhost);
  const created = await api(`vhosts/${v}`, {});
  const granted = await api(
    `permissions/${v}/${encodeURIComponent(decodeURIComponent(amqp.username))}`,
    { configure: '.*', write: '.*', read: '.*' },
  );
  if (!created.ok || !granted.ok) {
    throw new Error(
      `Could not prepare RabbitMQ vhost "${vhost}" via ${IT.rabbitManagementUrl} (HTTP ${created.status}/${granted.status}); the management plugin is required`,
    );
  }
}
