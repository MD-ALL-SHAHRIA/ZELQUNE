import type { CSSProperties, ReactNode } from 'react';
import { Img, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { ui } from '../lib/fonts';
import { mix, springAt } from '../lib/motion';
import { colors, springs } from '../video.config';

export type Rect = { x: number; y: number; w: number; h: number };

/** Frosted glass: 24px backdrop blur, ~12% white, 1px inner border, big soft shadow, light sweep. */
export function GlassCard({ children, sweep = 1, radius = 26, pad = 18, style }: { children: ReactNode; sweep?: number; radius?: number; pad?: number; style?: CSSProperties }) {
  return (
    <div
      style={{
        position: 'relative', padding: pad, borderRadius: radius, overflow: 'hidden',
        background: 'linear-gradient(140deg, rgba(255,255,255,0.18), rgba(255,255,255,0.08))',
        backdropFilter: 'blur(24px) saturate(1.3)',
        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.25), 0 50px 90px rgba(20,17,15,0.45), 0 12px 24px rgba(20,17,15,0.25)',
        ...style,
      }}
    >
      {children}
      {/* Light sweeping across the glass as it lands. */}
      <div
        style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', mixBlendMode: 'screen',
          background: `linear-gradient(110deg, transparent ${mix(-40, 120, sweep) - 18}%, rgba(255,255,255,0.35) ${mix(-40, 120, sweep)}%, transparent ${mix(-40, 120, sweep) + 18}%)`,
        }}
      />
    </div>
  );
}

/** A crop of a real page/element image, so lift-outs are pixel-identical to the site. */
export function Crop({ src, imgW, imgH, rect, width }: { src: string; imgW: number; imgH: number; rect: Rect; width: number }) {
  const k = width / rect.w;
  return (
    <div style={{ width, height: rect.h * k, overflow: 'hidden', borderRadius: 14, position: 'relative' }}>
      <Img src={staticFile(src)} style={{ position: 'absolute', width: imgW * k, height: imgH * k, left: -rect.x * k, top: -rect.y * k, maxWidth: 'none' }} />
    </div>
  );
}

/**
 * Lift-out: the element rises from where it sits on the page (`from`, frame px) to `to`, scaling up,
 * coming forward with a 3D tilt, onto a glass card.
 */
export function LiftOut({ at, from, to, tilt = [6, -10], children }: { at: number; from: Rect; to: Rect; tilt?: [number, number]; children: (width: number) => ReactNode }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = springAt(frame, fps, at, springs.soft);
  const sweep = springAt(frame, fps, at + 8, springs.camera);
  if (frame < at) return null;
  const pad = 18;
  const w = mix(from.w, to.w, p);
  const x = mix(from.x, to.x, p);
  const y = mix(from.y, to.y, p);
  return (
    <div style={{ position: 'absolute', left: x - pad, top: y - pad, perspective: 1600 }}>
      <div style={{ transform: `rotateX(${tilt[0] * p}deg) rotateY(${tilt[1] * p}deg) translateZ(${60 * p}px)`, transformStyle: 'preserve-3d' }}>
        <GlassCard sweep={sweep} pad={pad} style={{ boxShadow: `inset 0 0 0 1px rgba(255,255,255,${0.25 * p}), 0 ${50 * p}px ${90 * p}px rgba(20,17,15,${0.45 * p}), 0 12px 24px rgba(20,17,15,${0.25 * p})`, background: `rgba(255,255,255,${0.14 * p})` }}>
          {children(w)}
        </GlassCard>
      </div>
    </div>
  );
}

/** Spotlight: darkens everything but the target, with a brass rounded outline that draws itself. */
export function Spotlight({ at, until, rect, radius = 18 }: { at: number; until: number; rect: Rect; radius?: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const on = springAt(frame, fps, at, springs.soft) - springAt(frame, fps, until, springs.soft);
  const draw = springAt(frame, fps, at + 4, springs.camera);
  if (on <= 0.001) return null;
  const g = 10;
  const per = 2 * (rect.w + rect.h + 4 * g);
  return (
    <>
      <div style={{ position: 'absolute', left: rect.x - g, top: rect.y - g, width: rect.w + 2 * g, height: rect.h + 2 * g, borderRadius: radius, boxShadow: `0 0 0 4000px rgba(20,17,15,${0.55 * on})`, pointerEvents: 'none' }} />
      <svg style={{ position: 'absolute', left: rect.x - g - 3, top: rect.y - g - 3, overflow: 'visible', opacity: on }} width={rect.w + 2 * g + 6} height={rect.h + 2 * g + 6}>
        <rect x={3} y={3} width={rect.w + 2 * g} height={rect.h + 2 * g} rx={radius} fill="none" stroke={colors.glow} strokeWidth={3} strokeDasharray={per} strokeDashoffset={per * (1 - draw)} />
      </svg>
    </>
  );
}

/** Callout: a small glass pill (max 4 words) with an arrow pointing at the target. */
export function Callout({ at, x, y, text, side = 'top', scale = 1 }: { at: number; x: number; y: number; text: string; side?: 'top' | 'bottom' | 'left' | 'right'; scale?: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = springAt(frame, fps, at, springs.pop);
  if (frame < at) return null;
  const off = { top: [0, -1], bottom: [0, 1], left: [-1, 0], right: [1, 0] }[side];
  const translate = { top: 'translate(-50%, -100%)', bottom: 'translate(-50%, 0)', left: 'translate(-100%, -50%)', right: 'translate(0, -50%)' }[side];
  return (
    <div style={{ position: 'absolute', left: x + off[0] * 22 * scale, top: y + off[1] * 22 * scale, transform: `${translate} scale(${p})`, transformOrigin: 'center', opacity: Math.min(1, p * 2) }}>
      <div
        style={{
          padding: `${14 * scale}px ${26 * scale}px`, borderRadius: 999, fontFamily: ui, fontSize: 28 * scale, fontWeight: 500, letterSpacing: '0.04em', whiteSpace: 'nowrap',
          color: colors.espresso, background: 'rgba(255,251,245,0.82)', backdropFilter: 'blur(20px)',
          boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.6), 0 18px 40px rgba(20,17,15,0.3)',
        }}
      >
        {text}
      </div>
    </div>
  );
}
