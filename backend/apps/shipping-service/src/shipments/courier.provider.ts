import { type Courier } from '@zelqune/contracts';

export interface BookingRequest {
  orderId: string;
  /** For MANUAL: the consignment id the admin got from the courier's own panel. */
  consignmentId: string | null;
  trackingUrl: string | null;
}

export interface BookingResult {
  consignmentId: string | null;
  trackingUrl: string | null;
  booked: boolean;
}

/** Courier integration point (Steadfast/Paperfly/Pathao APIs arrive in M3). */
export interface CourierProvider {
  readonly courier: Courier;
  book(request: BookingRequest): Promise<BookingResult>;
}

export const COURIER_PROVIDERS = Symbol('COURIER_PROVIDERS');

/** M1: the admin books in the courier's panel and records the consignment id here. */
export class ManualCourierProvider implements CourierProvider {
  readonly courier = 'MANUAL' as const;

  book({ consignmentId, trackingUrl }: BookingRequest): Promise<BookingResult> {
    return Promise.resolve({ consignmentId, trackingUrl, booked: consignmentId !== null });
  }
}

/** Test double that "books" instantly with a deterministic consignment id. */
export class FakeCourierProvider implements CourierProvider {
  readonly booked: BookingRequest[] = [];
  constructor(readonly courier: Courier = 'STEADFAST') {}

  book(request: BookingRequest): Promise<BookingResult> {
    this.booked.push(request);
    return Promise.resolve({
      consignmentId: `FAKE-${request.orderId.slice(0, 8)}`,
      trackingUrl: `https://courier.example/track/${request.orderId}`,
      booked: true,
    });
  }
}
