import { AbsoluteFill, Img, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import index from '../../assets/scroll/index.json';

export type ScrollSpec = { seq: string; at: number; dur?: number };

/**
 * Real scrolling on a device screen: plays the recorded scroll frames of `seq` (see
 * scripts/capture-scroll.mjs) with an ease-in-out spring from frame `at`. Draws nothing before `at`,
 * so the screen keeps its existing content until the scroll begins.
 */
export function ScrollSeq({ seq, device, at, dur = 60 }: ScrollSpec & { device: 'desktop' | 'mobile' }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const key = `${seq}-${device}`;
  const n = (index as Record<string, number>)[key];
  if (!n || frame < at) return null;
  const p = spring({ frame: frame - at, fps, config: { damping: 200 }, durationInFrames: dur });
  const i = Math.min(n - 1, Math.round(p * (n - 1)));
  return (
    <AbsoluteFill>
      <Img src={staticFile(`scroll/${key}/${String(i).padStart(4, '0')}.jpg`)} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
    </AbsoluteFill>
  );
}
