/** Handed from checkout to the success page (sessionStorage) for the Purchase event only. */
export const LAST_ORDER_KEY = 'zq_last_order';
export interface LastOrder {
  code: string;
  totalPaisa: number;
  currency: 'BDT';
}
