import { APP_CONFIG } from '@zelqune/common';
import { type NotificationEnv } from './config/notification-env';
import { AuthEmailRpcController } from './email/auth-email.rpc.controller';
import { ConsoleEmailProvider, EMAIL_PROVIDER, SmtpEmailProvider } from './email/email.provider';
import { Module } from '@nestjs/common';
import { ServiceCoreModule } from '@zelqune/common';
import { notificationEnvSchema } from './config/notification-env';
import { NotificationEventHandlers } from './notify/notification.handlers';
import { NotificationService } from './notify/notification.service';
import { PrismaService } from './prisma/prisma.service';
import {
  NotificationSettingsRpcController,
  NotificationSettingsService,
} from './settings/notification-settings';
import { ConsoleSmsProvider, SMS_PROVIDER } from './sms/sms.provider';

@Module({
  imports: [
    ServiceCoreModule.forRoot({
      name: 'notification-service',
      prisma: PrismaService,
      envSchema: notificationEnvSchema,
    }),
  ],
  controllers: [NotificationSettingsRpcController, AuthEmailRpcController],
  providers: [
    NotificationService,
    NotificationSettingsService,
    NotificationEventHandlers,
    // M3: real SMS gateway provider (paid, owner approval).
    { provide: SMS_PROVIDER, useValue: new ConsoleSmsProvider() },
    {
      provide: EMAIL_PROVIDER,
      inject: [APP_CONFIG],
      useFactory: (c: NotificationEnv) =>
        c.EMAIL_DRIVER === 'smtp' && c.SMTP_HOST
          ? new SmtpEmailProvider({
              host: c.SMTP_HOST,
              port: c.SMTP_PORT,
              secure: c.SMTP_SECURE,
              user: c.SMTP_USER,
              pass: c.SMTP_PASS,
              from: c.MAIL_FROM,
            })
          : new ConsoleEmailProvider(),
    },
  ],
})
export class AppModule {}
