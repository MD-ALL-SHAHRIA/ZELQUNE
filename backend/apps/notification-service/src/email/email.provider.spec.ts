import { smtpTransportOptions } from './email.provider';

describe('smtpTransportOptions', () => {
  const base = { host: 'smtp.example.com', port: 587, secure: false, from: 'shop@example.com' };

  it('requires STARTTLS when credentials are sent', () => {
    expect(smtpTransportOptions({ ...base, user: 'u', pass: 'p' }).requireTLS).toBe(true);
  });

  it('allows plain SMTP without credentials (Mailpit) and with implicit TLS', () => {
    expect(smtpTransportOptions(base).requireTLS).toBe(false);
    expect(smtpTransportOptions({ ...base, port: 465, secure: true, user: 'u' }).requireTLS).toBe(
      false,
    );
  });
});
