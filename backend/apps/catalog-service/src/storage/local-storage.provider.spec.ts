import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { LocalStorageProvider, UploadRejectedError } from './local-storage.provider';

describe('LocalStorageProvider', () => {
  let dir: string;
  let storage: LocalStorageProvider;
  const key = 'media/0b6f0a3e-7f2a-4c35-9a5e-2f1d0c1b2a3e.webp';
  const body = Buffer.from('RIFF....WEBPVP8 fake image bytes');

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'zq-media-'));
    storage = new LocalStorageProvider({
      dir,
      publicBaseUrl: 'http://localhost:3002/dev-storage/',
      uploadTtlSeconds: 600,
    });
  });
  afterEach(() => rm(dir, { recursive: true, force: true }));

  const paramsOf = (url: string) => {
    const q = new URL(url).searchParams;
    return { ct: q.get('ct')!, len: q.get('len')!, exp: q.get('exp')!, sig: q.get('sig')! };
  };

  it('issues a signed PUT URL under the public base and accepts a matching upload', async () => {
    const target = await storage.createUploadUrl({
      key,
      contentType: 'image/webp',
      bytes: body.length,
    });
    expect(target.url.startsWith(`http://localhost:3002/dev-storage/${key}?`)).toBe(true);
    expect(target.headers).toEqual({ 'Content-Type': 'image/webp' });

    await storage.acceptUpload(key, paramsOf(target.url), 'image/webp', Readable.from([body]));
    await expect(storage.head(key)).resolves.toEqual({
      bytes: body.length,
      contentType: 'image/webp',
    });
  });

  it.each([
    [
      'tampered signature',
      (p: ReturnType<typeof paramsOf>) => ({ ...p, sig: 'f'.repeat(64) }),
      'image/webp',
      body,
    ],
    [
      'tampered length',
      (p: ReturnType<typeof paramsOf>) => ({ ...p, len: '999' }),
      'image/webp',
      body,
    ],
    ['wrong content type', (p: ReturnType<typeof paramsOf>) => p, 'image/png', body],
    ['expired', (p: ReturnType<typeof paramsOf>) => ({ ...p, exp: '1' }), 'image/webp', body],
    [
      'oversize body',
      (p: ReturnType<typeof paramsOf>) => p,
      'image/webp',
      Buffer.concat([body, body]),
    ],
    ['short body', (p: ReturnType<typeof paramsOf>) => p, 'image/webp', body.subarray(0, 4)],
  ])('rejects %s and stores nothing', async (_name, mutate, contentType, payload) => {
    const target = await storage.createUploadUrl({
      key,
      contentType: 'image/webp',
      bytes: body.length,
    });
    await expect(
      storage.acceptUpload(
        key,
        mutate(paramsOf(target.url)),
        contentType,
        Readable.from([payload]),
      ),
    ).rejects.toBeInstanceOf(UploadRejectedError);
    await expect(storage.head(key)).resolves.toBeNull();
  });

  it('rejects path traversal keys', async () => {
    await expect(
      storage.acceptUpload(
        '../etc/passwd',
        { ct: 'x', len: '1', exp: '9999999999', sig: 'x' },
        'x',
        Readable.from([body]),
      ),
    ).rejects.toBeInstanceOf(UploadRejectedError);
  });
});
