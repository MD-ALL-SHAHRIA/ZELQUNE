import { useVideoConfig } from 'remotion';

export type Format = 'story' | 'feed' | 'wide';

export type Layout = {
  w: number;
  h: number;
  format: Format;
  /** Text must stay inside these margins (Reels/Stories UI covers top 250 px and bottom 350 px). */
  safe: { top: number; bottom: number; side: number };
  headline: number;
  caption: number;
  small: number;
};

export function useLayout(): Layout {
  const { width: w, height: h } = useVideoConfig();
  const ratio = w / h;
  if (ratio < 0.7) {
    return { w, h, format: 'story', safe: { top: 250, bottom: 350, side: 84 }, headline: 132, caption: 72, small: 34 };
  }
  if (ratio < 1.2) {
    return { w, h, format: 'feed', safe: { top: 96, bottom: 96, side: 84 }, headline: 118, caption: 64, small: 30 };
  }
  return { w, h, format: 'wide', safe: { top: 90, bottom: 90, side: 130 }, headline: 136, caption: 70, small: 30 };
}
