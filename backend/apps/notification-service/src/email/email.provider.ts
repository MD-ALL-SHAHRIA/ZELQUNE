import { Logger } from '@nestjs/common';
import { createTransport, type Transporter } from 'nodemailer';

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/** Email delivery integration point (SMTP: Mailpit in dev, the owner's provider in production). */
export interface EmailProvider {
  readonly name: string;
  send(message: EmailMessage): Promise<{ providerRef: string }>;
}

export const EMAIL_PROVIDER = Symbol('EMAIL_PROVIDER');

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  pass?: string;
  from: string;
}

export class SmtpEmailProvider implements EmailProvider {
  readonly name = 'smtp';
  private readonly transport: Transporter;

  constructor(private readonly config: SmtpConfig) {
    this.transport = createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      // Port 587/25: upgrade to TLS whenever the server offers it.
      requireTLS: false,
      auth: config.user ? { user: config.user, pass: config.pass } : undefined,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    });
  }

  async send(m: EmailMessage): Promise<{ providerRef: string }> {
    const info = (await this.transport.sendMail({ from: this.config.from, ...m })) as {
      messageId?: string;
    };
    return { providerRef: info.messageId ?? '' };
  }
}

/** No email configured: says so in the log, without the address or the links. */
export class ConsoleEmailProvider implements EmailProvider {
  readonly name = 'console';
  private readonly logger = new Logger('Email');

  send(m: EmailMessage): Promise<{ providerRef: string }> {
    this.logger.warn(`EMAIL_DRIVER=console: "${m.subject}" was not sent (no email provider set)`);
    return Promise.resolve({ providerRef: 'console' });
  }
}

export class FakeEmailProvider implements EmailProvider {
  readonly name = 'fake';
  readonly sent: EmailMessage[] = [];
  send(m: EmailMessage): Promise<{ providerRef: string }> {
    this.sent.push(m);
    return Promise.resolve({ providerRef: `fake-${this.sent.length}` });
  }
}
