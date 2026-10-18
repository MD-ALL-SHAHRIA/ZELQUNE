import { bdPhoneSchema, normalizeBdPhone } from './phone';

describe('normalizeBdPhone', () => {
  it.each([
    ['01712345678', '+8801712345678'],
    ['+8801712345678', '+8801712345678'],
    ['8801712345678', '+8801712345678'],
    ['008801712345678', '+8801712345678'],
    ['+880 01712-345678', '+8801712345678'],
    ['017 1234 5678', '+8801712345678'],
    ['(017) 12.34.56.78', '+8801712345678'],
    ['০১৭১২৩৪৫৬৭৮', '+8801712345678'],
    ['+৮৮০১৯১২৩৪৫৬৭৮', '+8801912345678'],
    ['01312345678', '+8801312345678'],
  ])('%s -> %s', (input, expected) => {
    expect(normalizeBdPhone(input)).toBe(expected);
  });

  it.each([
    '01212345678', // 012 is not a mobile prefix
    '01112345678',
    '0171234567', // too short
    '017123456789', // too long
    '+911712345678', // other country
    '01712abc678',
    '',
    '+',
  ])('rejects %p', (input) => {
    expect(normalizeBdPhone(input)).toBeNull();
  });

  it('works as a zod schema with a readable error', () => {
    expect(bdPhoneSchema.parse(' 01812345678 ')).toBe('+8801812345678');
    const result = bdPhoneSchema.safeParse('12345');
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toMatch(/Bangladeshi mobile/);
  });
});
