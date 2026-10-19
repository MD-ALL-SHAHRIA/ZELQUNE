import { Module } from '@nestjs/common';
import { ServiceCoreModule } from '@zelqune/common';
import { notificationEnvSchema } from './config/notification-env';
import { NotificationEventHandlers } from './notify/notification.handlers';
import { NotificationService } from './notify/notification.service';
import { PrismaService } from './prisma/prisma.service';
import { ConsoleSmsProvider, SMS_PROVIDER } from './sms/sms.provider';

@Module({
  imports: [
    ServiceCoreModule.forRoot({
      name: 'notification-service',
      prisma: PrismaService,
      envSchema: notificationEnvSchema,
    }),
  ],
  providers: [
    NotificationService,
    NotificationEventHandlers,
    // M3: real SMS gateway provider (paid, owner approval).
    { provide: SMS_PROVIDER, useValue: new ConsoleSmsProvider() },
  ],
})
export class AppModule {}
