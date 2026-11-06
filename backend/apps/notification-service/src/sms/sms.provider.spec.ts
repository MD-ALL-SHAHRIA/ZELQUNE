import { Logger } from '@nestjs/common';
import { ConsoleSmsProvider, maskPhone } from './sms.provider';

describe('ConsoleSmsProvider', () => {
  const phone = '+8801712345678';
  const body = 'Order ZQ-ABC123 confirmed';
  let log: jest.SpyInstance;

  beforeEach(() => {
    log = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  });
  afterEach(() => log.mockRestore());

  it('never logs the phone or the body by default (production)', async () => {
    await new ConsoleSmsProvider().send(phone, body);
    const line = String(log.mock.calls[0][0]);
    expect(line).not.toContain(phone);
    expect(line).not.toContain('ZQ-ABC123');
    expect(line).toContain('678');
  });

  it('prints the full message in development', async () => {
    await new ConsoleSmsProvider(true).send(phone, body);
    expect(String(log.mock.calls[0][0])).toContain(body);
  });

  it('masks all but the last 3 digits', () => {
    expect(maskPhone(phone)).toBe('***********678');
    expect(maskPhone('12')).toBe('***');
  });
});
