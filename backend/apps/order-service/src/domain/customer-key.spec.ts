import { createHash } from 'node:crypto';
import { customerKey } from './customer-key';

describe('customerKey', () => {
  const secret = 'a'.repeat(32);

  it('is stable per phone and differs between phones', () => {
    expect(customerKey(secret, '+8801712345678')).toBe(customerKey(secret, '+8801712345678'));
    expect(customerKey(secret, '+8801712345678')).not.toBe(customerKey(secret, '+8801712345679'));
    expect(customerKey(secret, '+8801712345678')).toMatch(/^[0-9a-f]{32}$/);
  });

  it('depends on the secret and is not a plain (brute-forceable) hash of the phone', () => {
    expect(customerKey(secret, '+8801712345678')).not.toBe(
      customerKey('b'.repeat(32), '+8801712345678'),
    );
    const plain = createHash('sha256').update('+8801712345678').digest('hex').slice(0, 32);
    expect(customerKey(secret, '+8801712345678')).not.toBe(plain);
  });
});
