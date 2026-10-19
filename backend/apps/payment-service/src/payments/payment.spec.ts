import { PAYMENT_STATUSES } from '@zelqune/contracts';
import { canTransitionPayment } from './payment-state';
import { CodPaymentProvider, ManualMobilePaymentProvider } from './payment.provider';

describe('payment state machine', () => {
  const allowed = new Set([
    'SUBMITTED>VERIFIED',
    'SUBMITTED>REJECTED',
    'SUBMITTED>VOID',
    'COD_PENDING>COD_CONFIRMED',
    'COD_PENDING>VOID',
    'COD_CONFIRMED>COLLECTED',
    'COD_CONFIRMED>VOID',
  ]);

  it('allows exactly the documented transitions', () => {
    for (const from of PAYMENT_STATUSES) {
      for (const to of PAYMENT_STATUSES) {
        expect([`${from}>${to}`, canTransitionPayment(from, to)]).toEqual([
          `${from}>${to}`,
          allowed.has(`${from}>${to}`),
        ]);
      }
    }
  });

  it('a verified payment can never be voided or re-verified', () => {
    expect(canTransitionPayment('VERIFIED', 'VOID')).toBe(false);
    expect(canTransitionPayment('VERIFIED', 'VERIFIED')).toBe(false);
  });
});

describe('payment providers', () => {
  const manual = new ManualMobilePaymentProvider();
  const cod = new CodPaymentProvider();

  it('manual mobile payments need a trxId and start SUBMITTED', () => {
    expect(
      manual.begin({
        method: 'BKASH_MANUAL',
        kind: 'ADVANCE',
        amountPaisa: 30000,
        trxId: 'ABC123XYZ',
      }),
    ).toEqual({ status: 'SUBMITTED' });
    expect(() =>
      manual.begin({ method: 'NAGAD_MANUAL', kind: 'FULL', amountPaisa: 1, trxId: null }),
    ).toThrow(expect.objectContaining({ code: 'TRX_ID_REQUIRED' }) as Error);
    expect(() =>
      manual.begin({ method: 'BKASH_MANUAL', kind: 'COD', amountPaisa: 1, trxId: 'ABC123' }),
    ).toThrow();
  });

  it('COD payments have no trxId and start COD_PENDING', () => {
    expect(cod.begin({ method: 'COD', kind: 'COD', amountPaisa: 1, trxId: null })).toEqual({
      status: 'COD_PENDING',
    });
    expect(() =>
      cod.begin({ method: 'COD', kind: 'COD', amountPaisa: 1, trxId: 'ABC123' }),
    ).toThrow();
    expect(() =>
      cod.begin({ method: 'COD', kind: 'ADVANCE', amountPaisa: 1, trxId: null }),
    ).toThrow();
  });
});
