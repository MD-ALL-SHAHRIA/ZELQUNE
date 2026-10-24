import { Module } from '@nestjs/common';
import { AdminBusinessController } from './admin-business.controller';
import { AdminCatalogController } from './admin-catalog.controller';
import { AdminInsightsController } from './admin-insights.controller';
import { AdminOrdersController } from './admin-orders.controller';

@Module({
  controllers: [
    AdminOrdersController,
    AdminCatalogController,
    AdminInsightsController,
    AdminBusinessController,
  ],
})
export class AdminModule {}
