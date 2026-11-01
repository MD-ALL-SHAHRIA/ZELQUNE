import { cn } from '@/shared/lib/cn';
import { Container } from '@/shared/ui/typography';

/** A quiet placeholder block in the shape of what is coming (never a spinner). */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn('animate-pulse bg-sand/70 motion-reduce:animate-none', className)}
    />
  );
}

/** Listing pages (shop, category): the header band and a grid of product cards. */
export function ListingSkeleton({ label }: { label: string }) {
  return (
    <div role="status" aria-label={label}>
      <div className="border-b border-line">
        <Container className="space-y-5 py-14 sm:py-20">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-12 w-72 max-w-full" />
        </Container>
      </div>
      <Container className="grid gap-x-5 gap-y-14 pt-10 pb-20 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-8">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="space-y-4">
            <Skeleton className="aspect-[4/5] w-full" />
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        ))}
      </Container>
    </div>
  );
}

/** Product page: gallery on the left, title, price and buttons on the right. */
export function ProductSkeleton({ label }: { label: string }) {
  return (
    <Container
      role="status"
      aria-label={label}
      className="grid gap-10 py-10 lg:grid-cols-[1.2fr_1fr] lg:gap-16 lg:py-16"
    >
      <Skeleton className="aspect-[4/5] w-full" />
      <div className="space-y-5">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-11 w-4/5" />
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    </Container>
  );
}
