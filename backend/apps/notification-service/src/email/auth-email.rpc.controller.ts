import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { APP_CONFIG, AppError } from '@zelqune/common';
import { type AuthMail, RPC_PATTERNS, type RpcRequest } from '@zelqune/contracts';
import { randomUUID } from 'node:crypto';
import { type NotificationEnv } from '../config/notification-env';
import { PrismaService } from '../prisma/prisma.service';
import { authEmail } from './auth-emails';
import { EMAIL_PROVIDER, type EmailProvider } from './email.provider';

/**
 * Account emails (ADR 0021), sent synchronously so the one-time link never sits in a queue or a
 * table. The log keeps the subject only, never the link.
 */
@Controller()
export class AuthEmailRpcController {
  constructor(
    @Inject(EMAIL_PROVIDER) private readonly email: EmailProvider,
    @Inject(APP_CONFIG) private readonly config: NotificationEnv,
    private readonly prisma: PrismaService,
  ) {}

  @MessagePattern(RPC_PATTERNS.notification.sendAuthEmail)
  async send(@Payload() req: RpcRequest<AuthMail>): Promise<{ sent: boolean }> {
    const mail = req.data;
    const message = authEmail(mail, this.config.STOREFRONT_URL);
    let status: 'SENT' | 'FAILED' = 'SENT';
    let providerRef: string | null = null;
    try {
      providerRef = (await this.email.send(message)).providerRef;
    } catch {
      status = 'FAILED';
    }
    await this.prisma.notificationLog.create({
      data: {
        eventId: randomUUID(),
        template: `auth.${mail.kind}`,
        channel: 'EMAIL',
        recipient: mail.to,
        body: message.subject,
        status,
        provider: this.email.name,
        providerRef,
      },
    });
    if (status === 'FAILED')
      throw new AppError(
        'EMAIL_FAILED',
        'We could not send the email. Please try again shortly.',
        503,
      );
    return { sent: this.email.name !== 'console' };
  }
}
