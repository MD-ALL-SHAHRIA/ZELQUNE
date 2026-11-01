import { assertStrongPassword } from './password-policy';

describe('password policy', () => {
  const own = ['Nusrat Jahan', 'nusrat.jahan@example.com', '+8801712345678'];
  it.each([
    'password123',
    'bangladesh123',
    'aaaaaaaaaaaa',
    'abababababab',
    '1234567890',
    'nusrat2026xx',
    'my8801712345678',
  ])('rejects %s', (pw) =>
    expect(() => assertStrongPassword(pw, own)).toThrow('less common password'),
  );
  it('accepts a long unusual passphrase', () => {
    expect(() => assertStrongPassword('wooden moon lamp at dusk', own)).not.toThrow();
  });
});
