import { Controller, Inject, Injectable } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { APP_CONFIG, OutboxService, SettingsStore } from '@zelqune/common';
import {
  normalizeBdPhone,
  notificationSettingsSchema,
  RPC_PATTERNS,
  type RpcRequest,
} from '@zelqune/contracts';
import { type NotificationEnv } from '../config/notification-env';
import { PrismaService } from '../prisma/prisma.service';

/** Who gets the owner's SMS alerts: the saved phone, else OWNER_NOTIFY_PHONE env. */
@Injectable()
export class NotificationSettingsService extends SettingsStore<typeof notificationSettingsSchema> {
  constructor(
    prisma: PrismaService,
    outbox: OutboxService,
    @Inject(APP_CONFIG) c: NotificationEnv,
  ) {
    super(
      prisma,
      outbox,
      'notification-service',
      'notifications',
      notificationSettingsSchema,
      () => ({
        ownerPhone: c.OWNER_NOTIFY_PHONE ? normalizeBdPhone(c.OWNER_NOTIFY_PHONE) : null,
      }),
    );
  }
}

@Controller()
export class NotificationSettingsRpcController {
  constructor(private readonly settings: NotificationSettingsService) {}

  @MessagePattern(RPC_PATTERNS.notification.settings.get)
  get() {
    return this.settings.get();
  }

  @MessagePattern(RPC_PATTERNS.notification.settings.update)
  update(@Payload() req: RpcRequest<unknown>) {
    return this.settings.update(req.data);
  }
}
