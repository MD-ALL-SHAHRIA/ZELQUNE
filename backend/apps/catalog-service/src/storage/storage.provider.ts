export interface UploadTarget {
  url: string;
  method: 'PUT';
  /** Headers the client must send with the PUT (they are part of the signature). */
  headers: Record<string, string>;
  expiresAt: Date;
}

export interface StoredObject {
  bytes: number;
  contentType: string | undefined;
}

/** Object storage for product media. R2 in production, LocalStorageProvider in dev/tests. */
export interface StorageProvider {
  createUploadUrl(params: {
    key: string;
    contentType: string;
    bytes: number;
  }): Promise<UploadTarget>;
  head(key: string): Promise<StoredObject | null>;
  publicUrl(key: string): string;
}

export const STORAGE_PROVIDER = Symbol('STORAGE_PROVIDER');
