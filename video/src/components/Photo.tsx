import type { CSSProperties } from 'react';
import { AbsoluteFill, Img, staticFile, useVideoConfig } from 'remotion';
import { mix } from '../lib/motion';

type Props = {
  src: string;
  /** Natural size of the image. */
  size: [number, number];
  /** Focus point (0–1 of the image) kept at the frame centre, clamped to the image edges. */
  focus: [number, number];
  zoom?: number;
  /** 0 = cold, dim, grey "before" grade; 1 = the photo's own warm light. */
  warmth?: number;
  style?: CSSProperties;
};

/** Full-bleed photo with a camera (focus + zoom) and a cold→warm colour grade. */
export function Photo({ src, size: [iw, ih], focus: [fx, fy], zoom = 1, warmth = 1, style }: Props) {
  const { width: W, height: H } = useVideoConfig();
  const s = Math.max(W / iw, H / ih) * zoom;
  const w = iw * s;
  const h = ih * s;
  const left = Math.min(0, Math.max(W - w, W / 2 - fx * w));
  const top = Math.min(0, Math.max(H - h, H / 2 - fy * h));
  const c = 1 - warmth;
  return (
    <AbsoluteFill style={{ overflow: 'hidden', ...style }}>
      <Img
        src={staticFile(src)}
        style={{
          position: 'absolute', left, top, width: w, height: h,
          filter: `grayscale(${mix(0, 0.9, c)}) brightness(${mix(1, 0.42, c)}) contrast(${mix(1, 1.08, c)})`,
        }}
      />
      {/* Blue-cold tint that lifts as the light comes on. */}
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, #1B2A3A, #0E141B)', mixBlendMode: 'soft-light', opacity: c * 0.9 }} />
    </AbsoluteFill>
  );
}

export const HERO = {
  moon: { src: 'images/moon-v2.webp', size: [2400, 1350] as [number, number], piece: [0.76, 0.45] as [number, number] },
  curve: { src: 'images/curve-v2.webp', size: [2400, 1350] as [number, number], piece: [0.74, 0.45] as [number, number] },
  half: { src: 'images/half-v2.webp', size: [2400, 1350] as [number, number], piece: [0.75, 0.45] as [number, number] },
};
