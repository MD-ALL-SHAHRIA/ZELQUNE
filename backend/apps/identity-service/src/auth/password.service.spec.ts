import * as argon2 from 'argon2';
import { ARGON2_OPTIONS, PasswordService } from './password.service';

describe('PasswordService', () => {
  const service = new PasswordService();

  beforeAll(() => service.onModuleInit());

  it('hashes with argon2id and the OWASP parameters', async () => {
    const hash = await service.hash('correct horse battery staple');
    expect(hash).toMatch(/^\$argon2id\$v=19\$/);
    expect(hash).toContain('m=19456');
    expect(hash).toContain('t=2');
    expect(hash).toContain('p=1');
    expect(service.needsRehash(hash)).toBe(false);
  });

  it('verifies the right password and rejects a wrong one', async () => {
    const hash = await service.hash('correct horse battery staple');
    await expect(service.verify(hash, 'correct horse battery staple')).resolves.toBe(true);
    await expect(service.verify(hash, 'wrong password')).resolves.toBe(false);
  });

  it('returns false (after doing the work) when there is no stored hash', async () => {
    await expect(service.verify(null, 'not-a-real-password-placeholder')).resolves.toBe(false);
    await expect(service.verify(undefined, 'anything')).resolves.toBe(false);
  });

  it('flags hashes with weaker parameters for rehash', async () => {
    const weak = await argon2.hash('pw', { ...ARGON2_OPTIONS, memoryCost: 4096, timeCost: 1 });
    expect(service.needsRehash(weak)).toBe(true);
  });

  it('treats malformed stored hashes as a failed verification', async () => {
    await expect(service.verify('not-a-hash', 'pw')).resolves.toBe(false);
  });
});
