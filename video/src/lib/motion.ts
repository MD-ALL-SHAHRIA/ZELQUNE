import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { springs } from '../video.config';

type SpringConfig = (typeof springs)[keyof typeof springs];

/** A 0→1 spring that starts at `delay` frames into the current sequence. */
export function useSpringAt(delay: number, config: SpringConfig = springs.soft): number {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config });
}

/** Spring helper for loops and lists, where hooks cannot be called per item. */
export function springAt(frame: number, fps: number, delay: number, config: SpringConfig = springs.soft): number {
  return spring({ frame: frame - delay, fps, config });
}

export const mix = (a: number, b: number, t: number) => a + (b - a) * t;
