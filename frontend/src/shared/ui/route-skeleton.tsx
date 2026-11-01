'use client';

import { useParams } from 'next/navigation';
import { ERROR_COPY } from '@/i18n/error-copy';
import { ListingSkeleton, ProductSkeleton } from './skeleton';

/** loading.tsx gets no params; this reads the language for the screen-reader label. */
export function RouteSkeleton({ kind }: { kind: 'listing' | 'product' }) {
  const { lang } = useParams<{ lang?: string }>();
  const label = ERROR_COPY[lang === 'bn' ? 'bn' : 'en'].loading;
  return kind === 'listing' ? <ListingSkeleton label={label} /> : <ProductSkeleton label={label} />;
}
