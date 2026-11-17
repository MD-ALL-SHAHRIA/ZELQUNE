import type { ReactNode } from 'react';
import { AbsoluteFill, Img, staticFile } from 'remotion';
import type { Layout } from '../lib/layout';
import { mix } from '../lib/motion';
import { colors } from '../video.config';

export type ArchBox = { x: number; y: number; w: number; h: number; text: { x: number; y: number; w: number; h: number; align: 'left' | 'center' } };

/** Where the opening's arch window sits in each format, and where its words go. */
export function archBox(L: Layout): ArchBox {
  if (L.format === 'wide') {
    const w = 520, h = 760;
    const x = L.w - L.safe.side - w - 60;
    return { x, y: (L.h - h) / 2, w, h, text: { x: L.safe.side, y: 0, w: x - L.safe.side - 80, h: L.h, align: 'left' } };
  }
  if (L.format === 'story') {
    const w = 600, h = 880;
    return { x: (L.w - w) / 2, y: 330, w, h, text: { x: L.safe.side, y: 330 + h + 40, w: L.w - 2 * L.safe.side, h: L.h - L.safe.bottom - (330 + h + 40), align: 'center' } };
  }
  const w = 470, h = 690;
  return { x: (L.w - w) / 2, y: 110, w, h, text: { x: L.safe.side, y: 110 + h + 30, w: L.w - 2 * L.safe.side, h: L.h - L.safe.bottom - (110 + h + 30), align: 'center' } };
}

/** The Zelqune arch outline, drawn by a moving point of brass light (`draw` 0→1). */
export function ArchLine({ box, draw, glow = 1 }: { box: ArchBox; draw: number; glow?: number }) {
  const g = 14;
  const w = box.w + 2 * g;
  const h = box.h + 2 * g;
  const r = w / 2;
  // Up the left side, over the arch, down the right side.
  const d = `M 0 ${h} L 0 ${r} A ${r} ${r} 0 0 1 ${w} ${r} L ${w} ${h}`;
  const len = 2 * (h - r) + Math.PI * r;
  // Position of the bright head along the path.
  const s = draw * len;
  let hx: number, hy: number;
  if (s < h - r) { hx = 0; hy = h - s; }
  else if (s < h - r + Math.PI * r) { const a = Math.PI - (s - (h - r)) / r; hx = r + r * Math.cos(a); hy = r - r * Math.sin(a); }
  else { hx = w; hy = r + (s - (h - r) - Math.PI * r); }
  return (
    <svg style={{ position: 'absolute', left: box.x - g, top: box.y - g, overflow: 'visible' }} width={w} height={h}>
      <defs>
        <filter id="archGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="10" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <path d={d} fill="none" stroke={colors.glow} strokeWidth={3} strokeLinecap="round" strokeDasharray={len} strokeDashoffset={len * (1 - draw)} filter="url(#archGlow)" opacity={glow} />
      {draw > 0.001 && draw < 0.999 && <circle cx={hx} cy={hy} r={7} fill="#FFF3DC" filter="url(#archGlow)" />}
    </svg>
  );
}

/** A photo seen through the arch, lit from `light` 0 (dark) to 1 (glowing). */
export function ArchWindow({ box, src, light = 1, zoom = 1, clip, children }: { box: ArchBox; src: string; light?: number; zoom?: number; clip?: string; children?: ReactNode }) {
  return (
    <div style={{ position: 'absolute', left: box.x, top: box.y, width: box.w, height: box.h, clipPath: clip ?? `inset(0 round ${box.w / 2}px ${box.w / 2}px 0 0)` }}>
      <Img src={staticFile(src)} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${zoom})`, filter: `brightness(${mix(0.06, 1, light)}) saturate(${mix(0.6, 1.08, light)})` }} />
      {children}
    </div>
  );
}

/** Warm light spilling out of the arch onto the dark wall. */
export function ArchBloom({ box, light }: { box: ArchBox; light: number }) {
  return (
    <AbsoluteFill
      style={{
        pointerEvents: 'none', mixBlendMode: 'screen',
        background: `radial-gradient(${box.w * 1.3}px ${box.h * 0.9}px at ${box.x + box.w / 2}px ${box.y + box.h * 0.45}px, rgba(233,184,114,${0.32 * light}), transparent 70%)`,
      }}
    />
  );
}
