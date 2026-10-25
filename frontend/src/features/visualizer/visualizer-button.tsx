'use client';

import dynamic from 'next/dynamic';
import { Frame } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/shared/lib/cn';
import type { VisualizerCopy, VisualizerPiece } from './visualizer-dialog';

// Code-split: the dialog's code downloads only when the visitor asks for it (warmed on hover or
// focus), so the product page's initial JavaScript stays the same.
const load = () => import('./visualizer-dialog');
const VisualizerDialog = dynamic(load, { ssr: false });

/** "See it on your wall" trigger. */
export function VisualizerButton({
  label,
  piece,
  slug,
  copy,
  className,
}: {
  label: string;
  piece: VisualizerPiece;
  slug: string;
  copy: VisualizerCopy;
  className?: string;
}) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onPointerEnter={() => void load()}
        onFocus={() => void load()}
        onClick={() => {
          setMounted(true);
          setOpen(true);
        }}
        className={cn(
          'group inline-flex items-center gap-2.5 text-[0.78rem] font-medium uppercase tracking-[0.16em] text-ink [:lang(bn)_&]:text-[0.95rem] [:lang(bn)_&]:normal-case [:lang(bn)_&]:tracking-normal',
          className,
        )}
      >
        <Frame aria-hidden strokeWidth={1.25} className="size-[1.1rem] text-walnut" />
        <span className="underline decoration-ink/25 underline-offset-[6px] transition-colors group-hover:decoration-ink">
          {label}
        </span>
      </button>
      {mounted ? (
        <VisualizerDialog
          open={open}
          onOpenChange={setOpen}
          piece={piece}
          slug={slug}
          copy={copy}
        />
      ) : null}
    </>
  );
}
