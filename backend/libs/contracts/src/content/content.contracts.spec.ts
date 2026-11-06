import { createShipmentInputSchema } from '../shipping/shipping.contracts';
import { clientSchema } from './content.contracts';

describe('links shown on the storefront', () => {
  it.each(['javascript:alert(1)', 'data:text/html,<script>alert(1)</script>', 'ftp://x.com/a'])(
    'rejects %s as a client link and a tracking link',
    (url) => {
      expect(clientSchema.safeParse({ name: 'Cafe', url }).success).toBe(false);
      expect(
        createShipmentInputSchema.safeParse({
          orderId: '6f1c1d3e-8f4b-4c2a-9a51-0c6f9a3e2b11',
          trackingUrl: url,
        }).success,
      ).toBe(false);
    },
  );

  it('keeps https links and an empty client link', () => {
    expect(clientSchema.parse({ name: 'Cafe', url: 'https://cafe.com.bd' }).url).toBe(
      'https://cafe.com.bd',
    );
    expect(clientSchema.parse({ name: 'Cafe' }).url).toBe('');
    expect(
      createShipmentInputSchema.parse({
        orderId: '6f1c1d3e-8f4b-4c2a-9a51-0c6f9a3e2b11',
        trackingUrl: 'https://steadfast.com.bd/t/123',
      }).trackingUrl,
    ).toBe('https://steadfast.com.bd/t/123');
  });
});
