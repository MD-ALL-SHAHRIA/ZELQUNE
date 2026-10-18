import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, normalize } from 'node:path';
import { type Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { type StorageProvider, type StoredObject, type UploadTarget } from './storage.provider';

export interface LocalStorageOptions {
  dir: string;
  publicBaseUrl: string;
  signingSecret?: string;
  uploadTtlSeconds: number;
}

export interface SignedUploadParams {
  ct: string;
  len: string;
  exp: string;
  sig: string;
}

export class UploadRejectedError extends Error {}

/**
 * Dev/test fake for R2: issues HMAC-signed PUT URLs served by catalog-service's
 * /dev-storage routes and stores files on disk. Never use in production.
 */
export class LocalStorageProvider implements StorageProvider {
  private readonly secret: string;

  constructor(private readonly options: LocalStorageOptions) {
    this.secret = options.signingSecret ?? randomBytes(32).toString('hex');
  }

  createUploadUrl({
    key,
    contentType,
    bytes,
  }: {
    key: string;
    contentType: string;
    bytes: number;
  }): Promise<UploadTarget> {
    const exp = Math.floor(Date.now() / 1000) + this.options.uploadTtlSeconds;
    const sig = this.sign(key, contentType, bytes, exp);
    const query = new URLSearchParams({
      ct: contentType,
      len: String(bytes),
      exp: String(exp),
      sig,
    });
    return Promise.resolve({
      url: `${this.publicUrl(key)}?${query.toString()}`,
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      expiresAt: new Date(exp * 1000),
    });
  }

  async head(key: string): Promise<StoredObject | null> {
    try {
      const info = await stat(this.pathFor(key));
      const meta = JSON.parse(await readFile(`${this.pathFor(key)}.meta.json`, 'utf8')) as {
        contentType?: string;
      };
      return { bytes: info.size, contentType: meta.contentType };
    } catch {
      return null;
    }
  }

  publicUrl(key: string): string {
    return `${this.options.publicBaseUrl.replace(/\/$/, '')}/${key}`;
  }

  /** Validates a signed upload and streams the body to disk (rejects oversize bodies). */
  async acceptUpload(
    key: string,
    params: SignedUploadParams,
    contentType: string | undefined,
    body: Readable,
  ): Promise<void> {
    const target = this.pathFor(key); // validates the key before anything else
    const bytes = Number(params.len);
    const exp = Number(params.exp);
    if (!Number.isInteger(bytes) || !Number.isInteger(exp) || exp < Date.now() / 1000) {
      throw new UploadRejectedError('Upload URL expired or malformed');
    }
    const expected = Buffer.from(this.sign(key, params.ct, bytes, exp));
    const given = Buffer.from(params.sig ?? '');
    if (expected.length !== given.length || !timingSafeEqual(expected, given)) {
      throw new UploadRejectedError('Invalid upload signature');
    }
    if (contentType !== params.ct)
      throw new UploadRejectedError('Content-Type does not match the upload URL');

    const tmp = `${target}.${randomBytes(4).toString('hex')}.part`;
    await mkdir(dirname(target), { recursive: true });
    let received = 0;
    try {
      await pipeline(
        body,
        async function* limit(source: AsyncIterable<Buffer>) {
          for await (const chunk of source) {
            received += chunk.length;
            if (received > bytes) throw new UploadRejectedError('Body larger than declared');
            yield chunk;
          }
        },
        createWriteStream(tmp),
      );
      if (received !== bytes)
        throw new UploadRejectedError('Body size does not match the upload URL');
      await rename(tmp, target);
      await writeFile(`${target}.meta.json`, JSON.stringify({ contentType }));
    } catch (err) {
      await rm(tmp, { force: true });
      throw err;
    }
  }

  filePath(key: string): string {
    return this.pathFor(key);
  }

  private sign(key: string, contentType: string, bytes: number, exp: number): string {
    return createHmac('sha256', this.secret)
      .update(`${key}\n${contentType}\n${bytes}\n${exp}`)
      .digest('hex');
  }

  private pathFor(key: string): string {
    const safe = normalize(key).replace(/^(\.\.(\/|\\|$))+/, '');
    if (safe !== key || key.includes('..')) throw new UploadRejectedError('Invalid key');
    return join(this.options.dir, safe);
  }
}
