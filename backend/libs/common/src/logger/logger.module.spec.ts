import { withoutQuery } from './logger.module';

describe('withoutQuery (request logs)', () => {
  it('drops the query string, which can carry personal data', () => {
    expect(withoutQuery('/v1/orders/track?code=ZQ-1&phone=01712345678')).toBe('/v1/orders/track');
    expect(withoutQuery('/v1/catalog/products')).toBe('/v1/catalog/products');
    expect(withoutQuery(undefined)).toBeUndefined();
  });
});
