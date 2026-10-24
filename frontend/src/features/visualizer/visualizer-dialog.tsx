'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { Download, ImagePlus, RotateCcw, X } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { SAMPLE } from '@/content/sample-images';
import { type Dictionary } from '@/i18n/dictionaries/en';
import { cn } from '@/shared/lib/cn';
import imageLoader from '@/shared/lib/image-loader';
import { buttonClass } from '@/shared/ui/button';
import {
  clampPlacement,
  containSize,
  coverCrop,
  fitWithin,
  initialPlacement,
  keyAction,
  maxWidth,
  MIN_WIDTH,
  movePlacement,
  pieceRect,
  type Placement,
  resizePlacement,
  saveFileName,
} from './geometry';

export interface VisualizerCopy {
  text: Dictionary['premium']['visualizer'];
  close: string;
  sampleNote: string;
}

export interface VisualizerPiece {
  src: string;
  alt: string;
  /** True while a sample photo stands in for the product. */
  sample: boolean;
  /** Width / height from the catalog's dimensions, or null to use the photo's own ratio. */
  aspect: number | null;
}

/** Sample walls (Unsplash, CORS enabled), cycled by "Try a sample wall". */
const SAMPLE_WALLS = [SAMPLE.bedroom.src, SAMPLE.livingNeutral.src, SAMPLE.homeHero.src];
/** Two buttons side by side on a phone: tighter tracking, and wrapping rather than clipping. */
const btn =
  'h-auto min-h-12 w-full whitespace-normal px-3 py-2 text-center leading-tight tracking-[0.1em]';
/** The saved image's longest edge. */
const SAVE_MAX = 2000;

/** Same-origin (Next's optimizer) or CORS-enabled (Unsplash) URL, so the canvas stays clean. */
const sized = (src: string, width: number) =>
  src.startsWith('blob:') ? src : imageLoader({ src, width, quality: 80 });

interface Wall {
  src: string;
  /** A visitor's own photo (object URL, never uploaded). */
  own: boolean;
  /** Index into SAMPLE_WALLS for sample walls. */
  sample: number;
}

function canvasIsClean(img: HTMLImageElement): boolean {
  try {
    const c = document.createElement('canvas');
    c.width = c.height = 1;
    const ctx = c.getContext('2d');
    if (!ctx) return false;
    ctx.drawImage(img, 0, 0, 1, 1);
    ctx.getImageData(0, 0, 1, 1);
    return true;
  } catch {
    return false;
  }
}

/**
 * "See it on your wall": the product photo over a wall photo (the visitor's own, which stays on
 * the device as an object URL, or a sample), moved by dragging or the arrow keys, sized with a
 * slider, and saved as a PNG drawn on a canvas. Loaded only when the visitor opens it.
 */
export default function VisualizerDialog({
  open,
  onOpenChange,
  piece,
  slug,
  copy,
}: {
  open: boolean;
  onOpenChange(open: boolean): void;
  piece: VisualizerPiece;
  slug: string;
  copy: VisualizerCopy;
}) {
  const t = copy.text;
  const [wall, setWall] = useState<Wall>({ src: SAMPLE_WALLS[0]!, own: false, sample: 0 });
  const [wallSize, setWallSize] = useState<{ w: number; h: number } | null>(null);
  const [photoAspect, setPhotoAspect] = useState<number | null>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  // null = the default placement for the current wall (a new wall or reset goes back to it).
  const [moved, setPlacement] = useState<Placement | null>(null);
  const [pieceCors, setPieceCors] = useState(true);
  const [clean, setClean] = useState({ wall: false, piece: false });
  const [saving, setSaving] = useState(false);

  const wallImg = useRef<HTMLImageElement>(null);
  const pieceImg = useRef<HTMLImageElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const drag = useRef<{ id: number; x: number; y: number; start: Placement } | null>(null);

  const aspect = piece.aspect ?? photoAspect ?? 4 / 5;
  const stageAspect = wallSize ? wallSize.w / wallSize.h : 4 / 3;
  const stage = wallSize ? containSize(wallSize.w, wallSize.h, box.w, box.h) : { w: 0, h: 0 };

  // The stage fills the space left by the controls, keeping the wall photo's ratio. A callback
  // ref, because the dialog's content mounts after this component.
  const [boxEl, setBoxEl] = useState<HTMLDivElement | null>(null);
  useLayoutEffect(() => {
    if (!boxEl) return;
    const measure = () => setBox({ w: boxEl.clientWidth, h: boxEl.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(boxEl);
    return () => ro.disconnect();
  }, [boxEl]);

  // Revoke the visitor's photo URL when it is replaced or the dialog unmounts.
  useEffect(() => {
    if (!wall.own) return;
    return () => URL.revokeObjectURL(wall.src);
  }, [wall]);

  const placement = wallSize ? (moved ?? initialPlacement(stageAspect, aspect)) : null;
  const reset = () => setPlacement(null);

  const setWallFrom = (next: Wall) => {
    setWallSize(null);
    setPlacement(null);
    setClean((c) => ({ ...c, wall: false }));
    setWall(next);
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !file.type.startsWith('image/')) return;
    setWallFrom({ src: URL.createObjectURL(file), own: true, sample: wall.sample });
  };

  const nextSample = () => {
    const i = wall.own ? wall.sample : (wall.sample + 1) % SAMPLE_WALLS.length;
    setWallFrom({ src: SAMPLE_WALLS[i]!, own: false, sample: i });
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!placement || (e.pointerType === 'mouse' && e.button !== 0)) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.focus({ preventScroll: true });
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, start: placement };
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId || !stage.w || !stage.h) return;
    setPlacement(
      movePlacement(
        d.start,
        (e.clientX - d.x) / stage.w,
        (e.clientY - d.y) / stage.h,
        stageAspect,
        aspect,
      ),
    );
  };
  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (drag.current?.id === e.pointerId) drag.current = null;
  };
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const action = keyAction(e.key, e.shiftKey);
    if (!action || !placement) return;
    e.preventDefault();
    const moved = movePlacement(placement, action.dx, action.dy, stageAspect, aspect);
    setPlacement(resizePlacement(moved, moved.w + action.dw, stageAspect, aspect));
  };

  async function save() {
    const w = wallImg.current;
    const p = pieceImg.current;
    if (!w || !p || !placement || !wallSize) return;
    setSaving(true);
    try {
      const size = fitWithin(w.naturalWidth, w.naturalHeight, SAVE_MAX, SAVE_MAX);
      const canvas = document.createElement('canvas');
      canvas.width = size.w;
      canvas.height = size.h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(w, 0, 0, size.w, size.h);
      const r = pieceRect(placement, size.w, size.h, aspect);
      const crop = coverCrop(p.naturalWidth, p.naturalHeight, aspect);
      // The same soft wall shadow as the preview.
      ctx.save();
      ctx.shadowColor = 'rgba(43,30,25, 0.38)';
      ctx.shadowBlur = r.w * 0.08;
      ctx.shadowOffsetY = r.w * 0.035;
      ctx.fillStyle = '#E6E8D8';
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.restore();
      ctx.drawImage(p, crop.sx, crop.sy, crop.sw, crop.sh, r.x, r.y, r.w, r.h);
      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = saveFileName(slug);
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch {
      // A tainted canvas (no CORS on a photo): hide saving instead of failing loudly.
      setClean({ wall: false, piece: false });
    } finally {
      setSaving(false);
    }
  }

  const max = maxWidth(stageAspect, aspect);
  const canSave = clean.wall && clean.piece && !!placement;
  const rect = placement ? clampPlacement(placement, stageAspect, aspect) : null;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/50 backdrop-blur-[3px] motion-safe:data-[state=open]:animate-[fade-in_300ms_ease-out]" />
        <Dialog.Content
          aria-describedby="visualizer-text"
          className="fixed inset-0 z-50 flex flex-col bg-paper outline-none motion-safe:data-[state=open]:animate-[fade-up_420ms_var(--ease-out-soft)] lg:inset-auto lg:left-1/2 lg:top-1/2 lg:h-[min(860px,calc(100dvh-4rem))] lg:w-[min(1240px,calc(100vw-4rem))] lg:-translate-x-1/2 lg:-translate-y-1/2 lg:shadow-[0_40px_120px_-30px_rgba(43,30,25,0.55)]"
        >
          <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4 lg:px-8 lg:py-5">
            <Dialog.Title className="font-display text-2xl font-medium leading-tight sm:text-[1.75rem] [:lang(bn)_&]:font-normal">
              {t.title}
            </Dialog.Title>
            <Dialog.Close
              aria-label={copy.close}
              className="-mr-2 grid size-11 shrink-0 place-items-center text-ink transition-opacity hover:opacity-60"
            >
              <X className="size-5" strokeWidth={1.25} />
            </Dialog.Close>
          </div>

          <div className="flex min-h-0 flex-1 flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_22rem]">
            {/* Stage */}
            <div className="relative min-h-0 flex-1 bg-sand/70 p-3 sm:p-5 lg:p-8">
              <div ref={setBoxEl} className="grid size-full place-items-center">
                <div
                  className={cn(
                    'relative overflow-hidden bg-sand shadow-[0_20px_60px_-30px_rgba(43,30,25,0.5)] transition-opacity duration-500',
                    wallSize && stage.w ? 'opacity-100' : 'opacity-0',
                  )}
                  style={
                    stage.w
                      ? { width: stage.w, height: stage.h }
                      : { width: '100%', height: '100%' }
                  }
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- local object URLs and canvas-safe CORS images */}
                  <img
                    ref={wallImg}
                    key={wall.src}
                    src={sized(wall.src, 1600)}
                    crossOrigin={wall.own ? undefined : 'anonymous'}
                    alt=""
                    draggable={false}
                    onLoad={(e) => {
                      const img = e.currentTarget;
                      setWallSize({ w: img.naturalWidth, h: img.naturalHeight });
                      setClean((c) => ({ ...c, wall: canvasIsClean(img) }));
                    }}
                    className="absolute inset-0 size-full select-none object-cover"
                  />
                  {rect ? (
                    <div
                      role="group"
                      tabIndex={0}
                      aria-label={piece.alt}
                      aria-describedby="visualizer-hint"
                      onPointerDown={onPointerDown}
                      onPointerMove={onPointerMove}
                      onPointerUp={endDrag}
                      onPointerCancel={endDrag}
                      onKeyDown={onKeyDown}
                      className="group absolute cursor-grab touch-none select-none outline-none active:cursor-grabbing"
                      style={{
                        left: `${(rect.x - rect.w / 2) * 100}%`,
                        top: `${(rect.y - (rect.w * stageAspect) / aspect / 2) * 100}%`,
                        width: `${rect.w * 100}%`,
                        aspectRatio: String(aspect),
                      }}
                    >
                      <div className="size-full bg-sand shadow-[0_18px_40px_-12px_rgba(43,30,25,0.55)] ring-1 ring-ink/10 transition-[box-shadow] group-focus-visible:ring-2 group-focus-visible:ring-amber group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-transparent">
                        {/* eslint-disable-next-line @next/next/no-img-element -- drawn onto the canvas */}
                        <img
                          ref={pieceImg}
                          key={pieceCors ? 'cors' : 'plain'}
                          src={sized(piece.src, 1200)}
                          crossOrigin={pieceCors ? 'anonymous' : undefined}
                          alt=""
                          draggable={false}
                          onLoad={(e) => {
                            const img = e.currentTarget;
                            setPhotoAspect(img.naturalWidth / img.naturalHeight);
                            setClean((c) => ({ ...c, piece: pieceCors && canvasIsClean(img) }));
                          }}
                          onError={() => {
                            if (pieceCors) setPieceCors(false);
                          }}
                          className="pointer-events-none size-full object-cover"
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="space-y-5 border-t border-line px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 lg:space-y-7 lg:overflow-y-auto lg:border-l lg:border-t-0 lg:px-8 lg:py-8">
              <p id="visualizer-text" className="text-xs leading-relaxed text-ink/75 sm:text-sm">
                {t.text}
              </p>
              <div className="grid grid-cols-2 gap-2 lg:grid-cols-1 lg:gap-3">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className={buttonClass('primary', 'md', btn)}
                >
                  <ImagePlus aria-hidden className="size-4 shrink-0" strokeWidth={1.5} />
                  <span>{t.upload}</span>
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={onFile}
                  className="sr-only"
                  tabIndex={-1}
                  aria-hidden
                />
                <button
                  type="button"
                  onClick={nextSample}
                  className={buttonClass('outline', 'md', btn)}
                >
                  <span>{t.sample}</span>
                </button>
              </div>

              <div className="space-y-3">
                <div className="flex items-baseline justify-between gap-4">
                  <label
                    htmlFor="visualizer-size"
                    className="text-[0.7rem] font-medium uppercase tracking-eyebrow text-stone [:lang(bn)_&]:text-sm [:lang(bn)_&]:normal-case [:lang(bn)_&]:tracking-normal"
                  >
                    {t.size}
                  </label>
                  <button
                    type="button"
                    onClick={reset}
                    className="inline-flex items-center gap-1.5 text-xs text-stone underline-offset-4 transition-colors hover:text-ink hover:underline"
                  >
                    <RotateCcw aria-hidden className="size-3.5" strokeWidth={1.5} />
                    {t.reset}
                  </button>
                </div>
                <input
                  id="visualizer-size"
                  type="range"
                  min={Math.round(MIN_WIDTH * 100)}
                  max={Math.round(max * 100)}
                  step={1}
                  value={Math.round((rect?.w ?? 0.3) * 100)}
                  disabled={!rect}
                  onChange={(e) =>
                    placement &&
                    setPlacement(
                      resizePlacement(placement, Number(e.target.value) / 100, stageAspect, aspect),
                    )
                  }
                  className="block h-6 w-full cursor-pointer accent-walnut"
                />
                <p id="visualizer-hint" className="text-xs leading-relaxed text-stone">
                  {t.hint}
                </p>
              </div>

              {canSave ? (
                <button
                  type="button"
                  onClick={save}
                  disabled={saving}
                  className={buttonClass('outline', 'md', 'w-full lg:h-12')}
                >
                  <Download aria-hidden className="size-4" strokeWidth={1.5} />
                  {t.save}
                </button>
              ) : null}

              {piece.sample ? (
                <p className="text-[0.7rem] leading-relaxed text-stone">{copy.sampleNote}</p>
              ) : null}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
