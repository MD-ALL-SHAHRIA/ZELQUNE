import { HeadObjectCommand, NotFound, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { type StorageProvider, type StoredObject, type UploadTarget } from './storage.provider';

export interface R2Options {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicBaseUrl: string;
  uploadTtlSeconds: number;
}

/** Cloudflare R2 through its S3-compatible API. Presigned PUT pins content type and length. */
export class R2StorageProvider implements StorageProvider {
  private readonly client: S3Client;

  constructor(private readonly options: R2Options) {
    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${options.accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: options.accessKeyId, secretAccessKey: options.secretAccessKey },
    });
  }

  async createUploadUrl({
    key,
    contentType,
    bytes,
  }: {
    key: string;
    contentType: string;
    bytes: number;
  }): Promise<UploadTarget> {
    const command = new PutObjectCommand({
      Bucket: this.options.bucket,
      Key: key,
      ContentType: contentType,
      ContentLength: bytes,
    });
    const url = await getSignedUrl(this.client, command, {
      expiresIn: this.options.uploadTtlSeconds,
      signableHeaders: new Set(['content-type', 'content-length']),
    });
    return {
      url,
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      expiresAt: new Date(Date.now() + this.options.uploadTtlSeconds * 1000),
    };
  }

  async head(key: string): Promise<StoredObject | null> {
    try {
      const res = await this.client.send(
        new HeadObjectCommand({ Bucket: this.options.bucket, Key: key }),
      );
      return { bytes: res.ContentLength ?? 0, contentType: res.ContentType };
    } catch (err) {
      if (err instanceof NotFound || (err as { name?: string }).name === 'NotFound') return null;
      throw err;
    }
  }

  publicUrl(key: string): string {
    return `${this.options.publicBaseUrl.replace(/\/$/, '')}/${key}`;
  }
}
