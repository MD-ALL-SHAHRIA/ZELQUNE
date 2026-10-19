import { Module } from '@nestjs/common';
import { AdminCatalogController } from './admin-catalog.controller';
import { AdminInsightsController } from './admin-insights.controller';
import { AdminOrdersController } from './admin-orders.controller';

@Module({ controllers: [AdminOrdersController, AdminCatalogController, AdminInsightsController] })
export class AdminModule {}
