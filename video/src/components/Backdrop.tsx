import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { colors } from '../video.config';

type Tone = 'warm' | 'paper' | 'dark' | 'cold';

const grounds: Record<Tone, { base: string; glowA: string; glowB: string }> = {
  paper: { base: colors.paper, glowA: 'rgba(233,184,114,0.28)', glowB: 'rgba(217,180,122,0.18)' },
  warm: { base: colors.cream, glowA: 'rgba(233,184,114,0.42)', glowB: 'rgba(122,92,48,0.16)' },
  dark: { base: colors.night, glowA: 'rgba(233,184,114,0.22)', glowB: 'rgba(59,41,34,0.9)' },
  cold: { base: colors.coldDeep, glowA: 'rgba(201,211,220,0.16)', glowB: 'rgba(27,34,41,0.9)' },
};

/** Soft brand gradient with two slow-drifting glows (parallax layer 0). */
export function Backdrop({ tone = 'paper', drift = 1 }: { tone?: Tone; drift?: number }) {
  const frame = useCurrentFrame();
  const g = grounds[tone];
  const dx = Math.sin(frame / 90) * 6 * drift;
  const dy = Math.cos(frame / 110) * 5 * drift;
  return (
    <AbsoluteFill style={{ background: g.base }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(55% 45% at ${28 + dx}% ${24 + dy}%, ${g.glowA}, transparent 70%),
            radial-gradient(60% 50% at ${78 - dx}% ${82 - dy}%, ${g.glowB}, transparent 70%)`,
        }}
      />
    </AbsoluteFill>
  );
}

/** Animated film grain over everything. */
export function Grain({ opacity = 0.07 }: { opacity?: number }) {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: 'none', mixBlendMode: 'overlay', opacity }}>
      <svg width="100%" height="100%">
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={frame % 12} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>
    </AbsoluteFill>
  );
}

/** Soft vignette for depth. */
export function Vignette({ strength = 0.35 }: { strength?: number }) {
  return (
    <AbsoluteFill
      style={{ background: `radial-gradient(120% 90% at 50% 45%, transparent 55%, rgba(20,17,15,${strength}))` }}
    />
  );
}

/** Cold window light falling diagonally across the wall, drifting slowly (the "before" world). */
export function LightShaft({ offset = 0 }: { offset?: number }) {
  const frame = useCurrentFrame();
  const x = -15 + Math.sin((frame + offset) / 60) * 6;
  return (
    <AbsoluteFill style={{ mixBlendMode: 'screen', pointerEvents: 'none' }}>
      <AbsoluteFill
        style={{
          background: `linear-gradient(115deg, transparent ${32 + x}%, rgba(190,210,230,0.16) ${40 + x}%, rgba(190,210,230,0.05) ${52 + x}%, transparent ${58 + x}%),
            linear-gradient(115deg, transparent ${58 + x}%, rgba(190,210,230,0.10) ${63 + x}%, transparent ${70 + x}%)`,
          filter: 'blur(6px)',
        }}
      />
    </AbsoluteFill>
  );
}
