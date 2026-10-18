import { Global, Logger, Module } from '@nestjs/common';
import { APP_CONFIG } from '@zelqune/common';
import { type CatalogEnv } from '../config/catalog-env';
import { DevStorageController } from './dev-storage.controller';
import { LocalStorageProvider } from './local-storage.provider';
import { R2StorageProvider } from './r2-storage.provider';
import { STORAGE_PROVIDER, type StorageProvider } from './storage.provider';

@Global()
@Module({
  controllers: [DevStorageController],
  providers: [
    {
      provide: STORAGE_PROVIDER,
      inject: [APP_CONFIG],
      useFactory: (config: CatalogEnv): StorageProvider => {
        if (config.STORAGE_DRIVER === 'r2') {
          return new R2StorageProvider({
            accountId: config.R2_ACCOUNT_ID ?? '',
            accessKeyId: config.R2_ACCESS_KEY_ID ?? '',
            secretAccessKey: config.R2_SECRET_ACCESS_KEY ?? '',
            bucket: config.R2_BUCKET ?? '',
            publicBaseUrl: config.MEDIA_PUBLIC_BASE_URL,
            uploadTtlSeconds: config.UPLOAD_URL_TTL_SECONDS,
          });
        }
        if (!config.LOCAL_STORAGE_SIGNING_SECRET) {
          new Logger('Storage').warn(
            'LOCAL_STORAGE_SIGNING_SECRET unset: using a random per-process secret',
          );
        }
        return new LocalStorageProvider({
          dir: config.LOCAL_STORAGE_DIR,
          publicBaseUrl: config.MEDIA_PUBLIC_BASE_URL,
          signingSecret: config.LOCAL_STORAGE_SIGNING_SECRET,
          uploadTtlSeconds: config.UPLOAD_URL_TTL_SECONDS,
        });
      },
    },
  ],
  exports: [STORAGE_PROVIDER],
})
export class StorageModule {}
