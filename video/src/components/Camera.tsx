import type { CSSProperties, ReactNode } from 'react';
import { AbsoluteFill, Img, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { mix } from '../lib/motion';
import type { El } from '../lib/site';
import { colors } from '../video.config';

/**
 * A camera key: from frame `at`, glide over `dur` frames to centre stage point (x, y) at frame
 * point (ax, ay), with zoom `scale` and tilt rx/ry (degrees). Critically damped spring, no bounce.
 */
export type CamKey = { at: number; dur?: number; x: number; y: number; scale: number; rx?: number; ry?: number; ax?: number; ay?: number };
export type CamState = Required<Omit<CamKey, 'at' | 'dur'>>;

export function cameraAt(frame: number, fps: number, keys: CamKey[], W: number, H: number, drift = true): CamState {
  const base = (k: CamKey): CamState => ({ x: k.x, y: k.y, scale: k.scale, rx: k.rx ?? 0, ry: k.ry ?? 0, ax: k.ax ?? W / 2, ay: k.ay ?? H / 2 });
  let s = base(keys[0]);
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    const p = spring({ frame: frame - k.at, fps, config: { damping: 200 }, durationInFrames: k.dur ?? 30 });
    const n = base(k);
    s = { x: mix(s.x, n.x, p), y: mix(s.y, n.y, p), scale: mix(s.scale, n.scale, p), rx: mix(s.rx, n.rx, p), ry: mix(s.ry, n.ry, p), ax: mix(s.ax, n.ax, p), ay: mix(s.ay, n.ay, p) };
  }
  if (drift) {
    // Never fully still: ~1.5% breathing zoom and a slow pan.
    s.scale *= 1 + 0.015 * Math.sin(frame / 50);
    s.x += (Math.sin(frame / 70) * 6) / s.scale;
    s.y += (Math.cos(frame / 85) * 4) / s.scale;
  }
  return s;
}

/** Where a stage point lands in the frame (valid when tilt is ~0, i.e. while holding on a target). */
export const project = (c: CamState, x: number, y: number): [number, number] => [c.ax + (x - c.x) * c.scale, c.ay + (y - c.y) * c.scale];

/** Wraps a stage (devices, pages) and films it through the camera. */
export function Camera({ keys, children, style }: { keys: CamKey[]; children: ReactNode; style?: CSSProperties }) {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const c = cameraAt(frame, fps, keys, width, height);
  return (
    <AbsoluteFill style={style}>
      <div
        style={{
          position: 'absolute', left: 0, top: 0, width, height, transformOrigin: '0 0',
          transform: `translate(${c.ax}px, ${c.ay}px) perspective(2400px) rotateX(${c.rx}deg) rotateY(${c.ry}deg) scale(${c.scale}) translate(${-c.x}px, ${-c.y}px)`,
        }}
      >
        {children}
      </div>
    </AbsoluteFill>
  );
}

/** A full-length page inside a device screen, scrolled to `scroll` (page CSS px). */
export function PageScreen({ src, pageWidth, screenWidth, scroll, children }: { src: string; pageWidth: number; screenWidth: number; scroll: number; children?: ReactNode }) {
  const k = screenWidth / pageWidth;
  return (
    <AbsoluteFill style={{ overflow: 'hidden', background: colors.paper }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: '100%', transform: `translateY(${-scroll * k}px)` }}>
        <Img src={staticFile(src)} style={{ width: '100%', display: 'block' }} />
        {/* Children are laid out in page CSS px. */}
        <div style={{ position: 'absolute', left: 0, top: 0, width: pageWidth, transformOrigin: '0 0', transform: `scale(${k})` }}>{children}</div>
      </div>
    </AbsoluteFill>
  );
}

/** Box of a page element in stage px, given the device screen box and the page scroll. */
export function onScreen(e: El, screen: { x: number; y: number; w: number }, pageWidth: number, scroll: number) {
  const k = screen.w / pageWidth;
  return { x: screen.x + e.x * k, y: screen.y + (e.y - scroll) * k, w: e.w * k, h: e.h * k, k };
}
