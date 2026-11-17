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
  // Sub-frame position: blend the two nearest recorded frames so slow scrolling glides, not steps.
  const pos = Math.min(n - 1, p * (n - 1));
  const i = Math.floor(pos);
  const f = pos - i;
  const src = (k: number) => staticFile(`scroll/${key}/${String(k).padStart(4, '0')}.jpg`);
  const style = { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' } as const;
  return (
    <AbsoluteFill>
      <Img src={src(i)} style={style} />
      {f > 0.02 && i + 1 < n && <Img src={src(i + 1)} style={{ ...style, opacity: f }} />}
    </AbsoluteFill>
  );
}
