import type { CSSProperties, ReactNode } from 'react';
import { Img, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { ui, display } from '../lib/fonts';
import { mix, springAt } from '../lib/motion';
import { colors, springs } from '../video.config';

/** The Zelqune arch mark (assets/brand/zelqune-mark.svg), inlined so it can be drawn and tinted. */
export function Mark({ size, color = colors.espresso, reveal = 1 }: { size: number; color?: string; reveal?: number }) {
  return (
    <svg
      viewBox="490 359 274 343"
      width={size * (274 / 343)}
      height={size}
      style={{ clipPath: `inset(${(1 - reveal) * 100}% 0 0 0 round ${size}px ${size}px 0 0)` }}
    >
      <path
        fillRule="evenodd"
        fill={color}
        d="M490 702V495.5A136.5 136.5 0 0 1 763 495.5V702Z M573.25 483.5A63 63 0 0 1 696.75 483.5Z M490 483.5H733.2L714.7 503.5H490Z M643.5 503.5H714.7L527.5 702H490V668.5Z"
      />
    </svg>
  );
}

/** Logo lockup: mark + spaced wordmark, letters rising one by one. */
export function Logo({ size, color = colors.espresso, delay = 0 }: { size: number; color?: string; delay?: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const mark = springAt(frame, fps, delay, springs.soft);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: size * 0.32 }}>
      <Mark size={size} color={color} reveal={mark} />
      <div style={{ display: 'flex', fontFamily: display, fontSize: size * 0.62, letterSpacing: '0.28em', color, fontWeight: 500 }}>
        {'ZELQUNE'.split('').map((ch, i) => {
          const p = springAt(frame, fps, delay + 6 + i * 2, springs.snappy);
          return (
            <span key={i} style={{ display: 'inline-block', overflow: 'hidden' }}>
              <span style={{ display: 'inline-block', transform: `translateY(${(1 - p) * 110}%)` }}>{ch}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

/** Glassmorphism card. */
export function Glass({ children, style, dark = false }: { children: ReactNode; style?: CSSProperties; dark?: boolean }) {
  return (
    <div
      style={{
        background: dark ? 'rgba(20,17,15,0.55)' : 'rgba(255,251,245,0.72)',
        backdropFilter: 'blur(18px) saturate(1.2)',
        border: `1px solid ${dark ? 'rgba(217,180,122,0.28)' : 'rgba(255,255,255,0.7)'}`,
        borderRadius: 28,
        boxShadow: '0 30px 60px rgba(59,41,34,0.18), 0 6px 14px rgba(59,41,34,0.10)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** Notification that slides in from the right with a spring. */
export function Toast({ title, text, delay, scale = 1, style }: { title: string; text: string; delay: number; scale?: number; style?: CSSProperties }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = springAt(frame, fps, delay, springs.pop);
  return (
    <Glass
      style={{
        position: 'absolute', display: 'flex', alignItems: 'center', gap: 22 * scale, padding: `${22 * scale}px ${30 * scale}px`,
        transform: `translateX(${(1 - p) * 120}%) scale(${mix(0.9, 1, p)})`, opacity: Math.min(1, p * 2), ...style,
      }}
    >
      <div style={{ width: 64 * scale, height: 64 * scale, borderRadius: 18 * scale, background: colors.espresso, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
        <Mark size={34 * scale} color={colors.brass} />
      </div>
      <div style={{ fontFamily: ui, whiteSpace: 'nowrap' }}>
        <div style={{ fontSize: 30 * scale, fontWeight: 500, color: colors.espresso }}>{title}</div>
        <div style={{ fontSize: 24 * scale, color: colors.stone, marginTop: 4 * scale }}>{text}</div>
      </div>
    </Glass>
  );
}

/**
 * Cursor that springs from `from` to `to` (px in the parent) and clicks at `clickAt`.
 */
export function Cursor({ from, to, moveAt, clickAt, size = 44 }: { from: [number, number]; to: [number, number]; moveAt: number; clickAt: number; size?: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const move = springAt(frame, fps, moveAt, springs.camera);
  const press = springAt(frame, fps, clickAt, springs.pop);
  const release = springAt(frame, fps, clickAt + 5, springs.pop);
  const down = press - release;
  const ripple = springAt(frame, fps, clickAt, springs.soft);
  const x = mix(from[0], to[0], move);
  const y = mix(from[1], to[1], move);
  const appear = springAt(frame, fps, moveAt - 10, springs.soft);
  return (
    <div style={{ position: 'absolute', left: x, top: y, opacity: appear, pointerEvents: 'none' }}>
      {frame >= clickAt && (
        <div
          style={{
            position: 'absolute', left: -size, top: -size, width: size * 2, height: size * 2, borderRadius: '50%',
            border: `3px solid ${colors.glow}`, transform: `scale(${mix(0.2, 1.6, ripple)})`, opacity: 1 - ripple,
          }}
        />
      )}
      <svg width={size} height={size} viewBox="0 0 24 24" style={{ transform: `scale(${1 - down * 0.18})`, filter: 'drop-shadow(0 4px 6px rgba(20,17,15,0.35))' }}>
        <path d="M4 2.5 L4 19.5 L8.6 15.4 L11.6 22 L14.6 20.7 L11.7 14.3 L18 14.3 Z" fill={colors.espresso} stroke="#FFFBF5" strokeWidth="1.4" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

/** A real product card captured from the shop grid. */
export function ProductCard({ src, width, style }: { src: string; width: number; style?: CSSProperties }) {
  return (
    <div
      style={{
        width, borderRadius: 22, overflow: 'hidden', background: colors.paper, padding: width * 0.035,
        boxShadow: '0 40px 70px rgba(59,41,34,0.28), 0 8px 18px rgba(59,41,34,0.14)', ...style,
      }}
    >
      <Img src={staticFile(src)} style={{ width: '100%', display: 'block', borderRadius: 14 }} />
    </div>
  );
}
