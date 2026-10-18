import { Module } from '@nestjs/common';
import { ServiceCoreModule } from '@zelqune/common';
import { PrismaService } from './prisma/prisma.service';

@Module({
  imports: [ServiceCoreModule.forRoot({ name: 'identity-service', prisma: PrismaService })],
})
export class AppModule {}
