#!/usr/bin/env node
// Generates local-only secrets into infra/.env (created from .env.example if missing):
//   JWT_PRIVATE_KEY / JWT_PUBLIC_KEY  ES256 (P-256) pair, PEM with "\n" escapes
//   LOCAL_STORAGE_SIGNING_SECRET      signs dev media upload URLs
// Existing non-empty values are kept unless --force. Never use these keys in production.
import { generateKeyPairSync, randomBytes } from 'node:crypto';
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const infra = join(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = join(infra, '.env');
const force = process.argv.includes('--force');

if (!existsSync(envPath)) copyFileSync(join(infra, '.env.example'), envPath);
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
  console.log('JWT ES256 key pair written to infra/.env');
} else {
  console.log('JWT keys already present (use --force to replace)');
}
if (force || !current('LOCAL_STORAGE_SIGNING_SECRET')) {
  set('LOCAL_STORAGE_SIGNING_SECRET', randomBytes(32).toString('hex'));
  console.log('LOCAL_STORAGE_SIGNING_SECRET written to infra/.env');
}
writeFileSync(envPath, env, { mode: 0o600 });
