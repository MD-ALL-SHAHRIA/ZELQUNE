import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { Backdrop, Vignette } from '../components/Backdrop';
import { KineticText } from '../components/Type';
import { useLayout } from '../lib/layout';
import { useSpringAt } from '../lib/motion';
import { colors, copy, springs } from '../video.config';

/** 0–3 s: the pain, named in the first second. A harsh tube light flickers over a cold wall. */
export function Hook() {
  const L = useLayout();
  const frame = useCurrentFrame();
  const on = useSpringAt(2, springs.pop);
  // Fluorescent stutter in the first half second, then a steady cold glare.
  const flicker = frame < 16 ? [1, 0.2, 1, 0.1, 0.9, 1, 0.3, 1][frame % 8] : 1;
  const tubeW = L.format === 'wide' ? 760 : 620;
  return (
    <AbsoluteFill>
      <Backdrop tone="cold" drift={0} />
      <AbsoluteFill style={{ opacity: on * flicker }}>
        <AbsoluteFill style={{ background: `radial-gradient(70% 55% at 50% ${L.format === 'story' ? 14 : 4}%, rgba(225,235,245,0.32), transparent 70%)` }} />
        <div
          style={{
            position: 'absolute', left: (L.w - tubeW) / 2, top: L.format === 'story' ? L.safe.top - 60 : 70, width: tubeW, height: 16,
            borderRadius: 8, background: '#F4F8FC', boxShadow: '0 0 40px 10px rgba(225,235,245,0.7), 0 0 140px 40px rgba(200,215,230,0.35)',
          }}
        />
      </AbsoluteFill>
      <Vignette strength={0.55} />
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', padding: L.safe.side }}>
        <KineticText
          lines={copy.hook}
          delay={3}
          stagger={4}
          size={L.headline * (L.format === 'wide' ? 1.35 : 1.25)}
          color={colors.cold}
          align="center"
          lineHeight={0.98}
          style={{ fontWeight: 500 }}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
