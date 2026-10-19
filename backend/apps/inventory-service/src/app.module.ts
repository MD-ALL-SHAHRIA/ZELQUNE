import { Module } from '@nestjs/common';
import { ServiceCoreModule } from '@zelqune/common';
import { inventoryEnvSchema } from './config/inventory-env';
import { PrismaService } from './prisma/prisma.service';
import { InventoryEventHandlers } from './stock/inventory.handlers';
import { InventoryRpcController } from './stock/inventory.rpc.controller';
import { InventoryService } from './stock/inventory.service';

@Module({
  imports: [
    ServiceCoreModule.forRoot({
      name: 'inventory-service',
      prisma: PrismaService,
      envSchema: inventoryEnvSchema,
    }),
  ],
  controllers: [InventoryRpcController],
  providers: [InventoryService, InventoryEventHandlers],
})
export class AppModule {}
