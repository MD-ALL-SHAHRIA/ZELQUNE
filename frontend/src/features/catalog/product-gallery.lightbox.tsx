'use client';

import * as Dialog from '@radix-ui/react-dialog';
import Image from 'next/image';
import { X } from 'lucide-react';
import { useEffect, useRef } from 'react';

/**
 * Full-screen photo view: every photo large on the quiet paper field, opened at the photo that
 * was clicked; scroll to see the rest, Esc or the close button to leave.
 */
export default function Lightbox({
  images,
  start,
  open,
  onClose,
  closeLabel,
}: {
  images: { src: string; alt: string }[];
  start: number;
  open: boolean;
  onClose(): void;
  closeLabel: string;
}) {
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => {
      const el = scroller.current?.querySelector<HTMLElement>(`[data-photo="${start}"]`);
      el?.scrollIntoView({ block: 'start' });
    });
    return () => cancelAnimationFrame(id);
  }, [open, start]);

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-0 z-50 bg-paper outline-none motion-safe:data-[state=open]:animate-[fade-in_280ms_ease-out]"
        >
          <Dialog.Title className="sr-only">{images[start]?.alt}</Dialog.Title>
          <div
            ref={scroller}
            className="scrollbar-none size-full snap-y snap-mandatory overflow-y-auto"
          >
            {images.map((img, i) => (
              <figure
                key={img.src}
                data-photo={i}
                className="relative h-dvh w-full snap-start p-3 sm:p-8 lg:p-12"
              >
                <div className="relative size-full">
                  <Image
                    src={img.src}
                    alt={img.alt}
                    fill
                    sizes="100vw"
                    priority={i === start}
                    className="object-contain"
                  />
                </div>
              </figure>
            ))}
          </div>
          <Dialog.Close
            aria-label={closeLabel}
            className="fixed right-4 top-4 grid size-12 place-items-center bg-paper/85 text-ink backdrop-blur transition-opacity hover:opacity-70 sm:right-6 sm:top-6"
          >
            <X className="size-6" strokeWidth={1.1} />
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
