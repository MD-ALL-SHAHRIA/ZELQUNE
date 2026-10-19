import { Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

export interface SmsResult {
  providerRef: string;
}

/** SMS gateway integration point (BD gateways are paid per SMS: M3, with owner approval). */
export interface SmsProvider {
  readonly name: string;
  send(to: string, body: string): Promise<SmsResult>;
}

export const SMS_PROVIDER = Symbol('SMS_PROVIDER');

/** Dev/test: prints the SMS instead of sending it. */
export class ConsoleSmsProvider implements SmsProvider {
  readonly name = 'console';
  private readonly logger = new Logger('SMS');

  send(to: string, body: string): Promise<SmsResult> {
    this.logger.log(`[SMS -> ${to}] ${body}`);
    return Promise.resolve({ providerRef: `console-${randomUUID()}` });
  }
}

/** Test double that records messages. */
export class FakeSmsProvider implements SmsProvider {
  readonly name = 'fake';
  readonly sent: { to: string; body: string }[] = [];
  failNext = false;

  send(to: string, body: string): Promise<SmsResult> {
    if (this.failNext) {
      this.failNext = false;
      return Promise.reject(new Error('gateway down'));
    }
    this.sent.push({ to, body });
    return Promise.resolve({ providerRef: `fake-${this.sent.length}` });
  }
}
