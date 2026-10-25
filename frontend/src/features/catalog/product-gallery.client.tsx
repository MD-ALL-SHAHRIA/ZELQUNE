'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';

const loadLightbox = () => import('./product-gallery.lightbox');
const Lightbox = dynamic(loadLightbox, { ssr: false });

/**
 * The gallery's small client part: the phone photo counter (which photo is in view) and the
 * click-to-zoom view, loaded on first use. The photos themselves are server-rendered children.
 */
export function GalleryShell({
  images,
  numbers,
  total,
  closeLabel,
  footer,
  children,
}: {
  images: { src: string; alt: string }[];
  /** Localised photo numbers ("1", "১", ...). */
  numbers: string[];
  total: string;
  closeLabel: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(0);
  const [zoom, setZoom] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const track = root.current?.querySelector<HTMLElement>('[data-gallery-track]');
    if (!track || images.length < 2) return;
    const slides = Array.from(track.children) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setCurrent(slides.indexOf(e.target as HTMLElement));
        }
      },
      { root: track, threshold: 0.6 },
    );
    slides.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, [images.length]);

  const onClick = (e: React.MouseEvent) => {
    const target = (e.target as HTMLElement).closest<HTMLElement>('[data-zoom]');
    if (!target) return;
    setMounted(true);
    setZoom(Number(target.dataset.zoom ?? 0));
  };

  return (
    <div ref={root}>
      <div onClick={onClick} onPointerOver={() => void loadLightbox()}>
        {children}
      </div>
      <div className="mt-4 flex items-start justify-between gap-6 lg:mt-5">
        <div className="min-w-0 flex-1">{footer}</div>
        {images.length > 1 ? (
          <p
            aria-hidden
            className="flex shrink-0 items-center gap-2.5 pt-1 text-xs tabular-nums tracking-[0.18em] text-stone lg:hidden"
          >
            <span className="text-ink">{numbers[current]}</span>
            <span className="block h-px w-6 bg-ink/30" />
            <span>{total}</span>
          </p>
        ) : null}
      </div>
      {mounted ? (
        <Lightbox
          images={images}
          start={zoom ?? 0}
          open={zoom !== null}
          onClose={() => setZoom(null)}
          closeLabel={closeLabel}
        />
      ) : null}
    </div>
  );
}
