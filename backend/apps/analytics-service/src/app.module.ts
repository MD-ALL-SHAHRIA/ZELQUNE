import { Module } from '@nestjs/common';
import { ServiceCoreModule } from '@zelqune/common';
import { AnalyticsRpcController } from './analytics.rpc.controller';
import { PrismaService } from './prisma/prisma.service';
import { AnalyticsEventHandlers } from './projections/analytics.handlers';
import { ProjectionsService } from './projections/projections.service';
import { StatsService } from './stats/stats.service';

@Module({
  imports: [ServiceCoreModule.forRoot({ name: 'analytics-service', prisma: PrismaService })],
  controllers: [AnalyticsRpcController],
  providers: [ProjectionsService, StatsService, AnalyticsEventHandlers],
})
export class AppModule {}
