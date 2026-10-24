import { type Tone } from '@/components/ui/badge';
import { type Schemas } from '@/lib/api';

export type Quote = Schemas['AdminQuoteDto_Output'];
export type QuoteStatus = Quote['status'];
export type QuoteKind = Quote['kind'];

export const QUOTE_STATUS: Record<QuoteStatus, { label: string; tone: Tone }> = {
  NEW: { label: 'New request', tone: 'warning' },
  QUOTED: { label: 'Quote sent', tone: 'info' },
  ACCEPTED: { label: 'Accepted', tone: 'success' },
  REJECTED: { label: 'Declined', tone: 'neutral' },
  EXPIRED: { label: 'Expired', tone: 'neutral' },
};

export const QUOTE_KIND: Record<QuoteKind, string> = {
  PRODUCT: 'Bulk order',
  DESIGN: 'Interior design',
  CONSTRUCTION: 'Construction',
};

export const SPACE: Record<string, string> = {
  HOME: 'Home',
  OFFICE: 'Office',
  RESTAURANT_CAFE: 'Restaurant or café',
  HOTEL: 'Hotel',
  RETAIL: 'Shop',
  OTHER: 'Other',
};

export const BUDGET: Record<string, string> = {
  UNDER_1_LAKH: 'Under ৳1 lakh',
  LAKH_1_TO_5: '৳1–5 lakh',
  LAKH_5_TO_15: '৳5–15 lakh',
  ABOVE_15_LAKH: 'Above ৳15 lakh',
  UNDER_50_LAKH: 'Under ৳50 lakh',
  LAKH_50_TO_1_CRORE: '৳50 lakh–1 crore',
  CRORE_1_TO_3: '৳1–3 crore',
  ABOVE_3_CRORE: 'Above ৳3 crore',
  NOT_SURE: 'Not sure yet',
};
