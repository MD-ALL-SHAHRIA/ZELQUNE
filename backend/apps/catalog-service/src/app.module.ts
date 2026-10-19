import { Module } from '@nestjs/common';
import { ServiceCoreModule } from '@zelqune/common';
import { CatalogAdminRpcController } from './admin/catalog-admin.rpc.controller';
import { CatalogAdminService } from './admin/catalog-admin.service';
import { CatalogRepository } from './catalog/catalog.repository';
import { CatalogRpcController } from './catalog/catalog.rpc.controller';
import { PublicCatalogService } from './catalog/public-catalog.service';
import { catalogEnvSchema } from './config/catalog-env';
import { PrismaService } from './prisma/prisma.service';
import { StorageModule } from './storage/storage.module';

@Module({
  imports: [
    ServiceCoreModule.forRoot({
      name: 'catalog-service',
      prisma: PrismaService,
      envSchema: catalogEnvSchema,
    }),
    StorageModule,
  ],
  controllers: [CatalogRpcController, CatalogAdminRpcController],
  providers: [CatalogRepository, PublicCatalogService, CatalogAdminService],
})
export class AppModule {}
