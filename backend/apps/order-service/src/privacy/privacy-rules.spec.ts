import { PRIVACY_REQUEST_STATUSES } from '@zelqune/contracts';
import { canTransitionPrivacy, maskPhone, orderFate } from './privacy-rules';

describe('privacy rules', () => {
  it('only allows the documented status moves', () => {
    const allowed = PRIVACY_REQUEST_STATUSES.flatMap((from) =>
      PRIVACY_REQUEST_STATUSES.filter((to) => canTransitionPrivacy(from, to)).map(
        (to) => `${from}->${to}`,
      ),
    );
    expect(allowed).toEqual([
      'PENDING->VERIFICATION_REQUIRED',
      'PENDING->IN_PROGRESS',
      'PENDING->REJECTED',
      'VERIFICATION_REQUIRED->IN_PROGRESS',
      'VERIFICATION_REQUIRED->REJECTED',
      'IN_PROGRESS->COMPLETED',
      'IN_PROGRESS->REJECTED',
    ]);
  });

  it('erases only orders where no money moved, keeps sales, blocks running orders', () => {
    const at = new Date();
    expect(orderFate({ status: 'CANCELLED', confirmedAt: null })).toBe('ERASE');
    expect(orderFate({ status: 'CANCELLED', confirmedAt: at })).toBe('RETAIN');
    expect(orderFate({ status: 'DELIVERED', confirmedAt: at })).toBe('RETAIN');
    expect(orderFate({ status: 'REFUNDED', confirmedAt: at })).toBe('RETAIN');
    expect(orderFate({ status: 'PENDING_PAYMENT', confirmedAt: null })).toBe('BLOCK');
    expect(orderFate({ status: 'SHIPPED', confirmedAt: at })).toBe('BLOCK');
  });

  it('masks a phone number', () => {
    expect(maskPhone('+8801712345678')).toBe('+88017******78');
  });
});
