import { rfqRequestSchema } from './quotes.contracts';

const base = { contactName: 'Nadia Rahman', phone: '01712345678' };

describe('rfqRequestSchema', () => {
  it('keeps product requests as before (kind defaults to PRODUCT)', () => {
    const parsed = rfqRequestSchema.parse({
      ...base,
      organizationName: 'Cafe Ltd',
      items: [{ description: 'Alo-Arch Panel', qty: 25 }],
    });
    expect(parsed.kind).toBe('PRODUCT');
    expect(parsed.design).toBeNull();
  });

  it('product requests need a company and at least one item, and no design brief', () => {
    const r = rfqRequestSchema.safeParse({ ...base, items: [] });
    expect(r.success).toBe(false);
    const paths = r.error?.issues.map((i) => i.path.join('.'));
    expect(paths).toEqual(expect.arrayContaining(['organizationName', 'items']));
    expect(
      rfqRequestSchema.safeParse({
        ...base,
        organizationName: 'X Ltd',
        items: [{ description: 'Panel', qty: 2 }],
        design: { spaceType: 'HOME' },
      }).success,
    ).toBe(false);
  });

  it('design requests need a space brief but no company or items', () => {
    const parsed = rfqRequestSchema.parse({
      ...base,
      kind: 'DESIGN',
      design: { spaceType: 'RESTAURANT_CAFE', sizeSqft: 1800, district: 'dhaka' },
    });
    expect(parsed.organizationName).toBeNull();
    expect(parsed.items).toEqual([]);
    expect(parsed.design).toEqual({
      spaceType: 'RESTAURANT_CAFE',
      sizeSqft: 1800,
      district: 'dhaka',
      budget: 'NOT_SURE',
      floors: null,
    });
    expect(rfqRequestSchema.safeParse({ ...base, kind: 'DESIGN' }).success).toBe(false);
  });

  it('construction enquiries need a brief and may give floors; design briefs may not', () => {
    const parsed = rfqRequestSchema.parse({
      ...base,
      kind: 'CONSTRUCTION',
      design: { spaceType: 'HOME', sizeSqft: 2400, district: 'gazipur', floors: 4 },
    });
    expect(parsed.design?.floors).toBe(4);
    expect(rfqRequestSchema.safeParse({ ...base, kind: 'CONSTRUCTION' }).success).toBe(false);
    expect(
      rfqRequestSchema.safeParse({
        ...base,
        kind: 'DESIGN',
        design: { spaceType: 'HOME', floors: 2 },
      }).success,
    ).toBe(false);
  });
});
