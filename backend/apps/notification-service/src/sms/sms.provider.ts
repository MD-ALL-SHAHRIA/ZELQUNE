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

/** Keeps the last 3 digits so a log line can be matched to a customer without exposing them. */
export function maskPhone(phone: string): string {
  return phone.length <= 3 ? '***' : `${'*'.repeat(phone.length - 3)}${phone.slice(-3)}`;
}

/**
 * Prints the SMS instead of sending it (until the M3 gateway). Outside development the phone is
 * masked and the body omitted: it carries order codes, which public tracking accepts with the phone.
 */
export class ConsoleSmsProvider implements SmsProvider {
  readonly name = 'console';
  private readonly logger = new Logger('SMS');

  constructor(private readonly showContent = false) {}

  send(to: string, body: string): Promise<SmsResult> {
    this.logger.log(
      this.showContent
        ? `[SMS -> ${to}] ${body}`
        : `[SMS -> ${maskPhone(to)}] (${body.length} chars)`,
    );
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
