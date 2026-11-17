#!/usr/bin/env node
// Generates local-only secrets into infra/.env (created from .env.example if missing):
//   JWT_PRIVATE_KEY / JWT_PUBLIC_KEY  ES256 (P-256) pair, PEM with "\n" escapes
//   LOCAL_STORAGE_SIGNING_SECRET      signs dev media upload URLs
//   CUSTOMER_KEY_SECRET               HMAC key for the pseudonymous customerKey (ADR 0010)
//   INTERNAL_RPC_SECRET               shared secret on internal TCP calls between services
// Existing non-empty values are kept unless --force. Never use dev keys in production.
// --prod: fill infra/.env.production instead (from .env.production.example), with fresh keys
// plus the database, RabbitMQ and Redis passwords. Run it on the server.
import { generateKeyPairSync, randomBytes } from 'node:crypto';
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const infra = join(dirname(fileURLToPath(import.meta.url)), '..');
const prod = process.argv.includes('--prod');
const envFile = prod ? '.env.production' : '.env';
const envPath = join(infra, envFile);
const force = process.argv.includes('--force');

if (!existsSync(envPath)) copyFileSync(join(infra, `${envFile}.example`), envPath);
let env = readFileSync(envPath, 'utf8');

const { privateKey, publicKey } = generateKeyPairSync('ec', {
  namedCurve: 'P-256',
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
});
const oneLine = (pem) => pem.trim().replace(/\n/g, '\\n');

const current = (key) => new RegExp(`^${key}=(.*)$`, 'm').exec(env)?.[1]?.trim() ?? '';
const set = (key, value) => {
  const line = `${key}=${value}`;
  env = new RegExp(`^${key}=.*$`, 'm').test(env)
    ? env.replace(new RegExp(`^${key}=.*$`, 'm'), () => line)
    : `${env.trimEnd()}\n${line}\n`;
};

const keysMissing = !current('JWT_PRIVATE_KEY') || !current('JWT_PUBLIC_KEY');
if (force || keysMissing) {
  set('JWT_PRIVATE_KEY', oneLine(privateKey));
  set('JWT_PUBLIC_KEY', oneLine(publicKey));
  console.log(`JWT ES256 key pair written to infra/${envFile}`);
} else {
  console.log('JWT keys already present (use --force to replace)');
}
if (force || !current('CUSTOMER_KEY_SECRET')) {
  set('CUSTOMER_KEY_SECRET', randomBytes(32).toString('hex'));
  console.log(`CUSTOMER_KEY_SECRET written to infra/${envFile}`);
}
if (force || !current('LOCAL_STORAGE_SIGNING_SECRET')) {
  set('LOCAL_STORAGE_SIGNING_SECRET', randomBytes(32).toString('hex'));
  console.log(`LOCAL_STORAGE_SIGNING_SECRET written to infra/${envFile}`);
}
if (force || !current('INTERNAL_RPC_SECRET')) {
  set('INTERNAL_RPC_SECRET', randomBytes(32).toString('hex'));
  console.log(`INTERNAL_RPC_SECRET written to infra/${envFile}`);
}
if (prod) {
  for (const key of [
    'POSTGRES_PASSWORD',
    'SERVICE_DB_PASSWORD',
    'RABBITMQ_PASSWORD',
    'REDIS_PASSWORD',
  ]) {
    if (force || !current(key)) {
      set(key, randomBytes(24).toString('hex'));
      console.log(`${key} written to infra/${envFile}`);
    }
  }
}
writeFileSync(envPath, env, { mode: 0o600 });
