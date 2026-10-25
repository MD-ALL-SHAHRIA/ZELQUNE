import { cn } from '@/lib/cn';

export function Skeleton({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'block rounded-md bg-[linear-gradient(90deg,var(--color-sand)_25%,var(--color-cream)_50%,var(--color-sand)_75%)] bg-[length:200%_100%] [animation:shimmer_1.6s_linear_infinite]',
        className,
      )}
    />
  );
}
