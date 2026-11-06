import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { Backdrop } from '../components/Backdrop';
import { KineticText } from '../components/Type';
import { Logo } from '../components/Ui';
import { ui } from '../lib/fonts';
import { useLayout } from '../lib/layout';
import { mix, springAt, useSpringAt } from '../lib/motion';
import { BEAT, beats, colors, copy, scenes, springs, timing } from '../video.config';

/** 39–45 s: logo, tagline, URL and a button that pulses on the beat; the last 2 s hold still. */
export function Cta() {
  const L = useLayout();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const holdFrom = beats(scenes.cta.length - 4);
  const btn = useSpringAt(timing.cta.button, springs.pop);
  // A soft kick every two beats until the hold.
  const kickStart = Math.floor(Math.min(frame, holdFrom) / (BEAT * 2)) * BEAT * 2;
  const kick = frame < holdFrom && frame > beats(4) ? 1 - springAt(frame, fps, kickStart, springs.snappy) : 0;
  const url = useSpringAt(timing.cta.url, springs.soft);
  const wide = L.format === 'wide';
  return (
    <AbsoluteFill>
      <Backdrop tone="warm" drift={frame < holdFrom ? 1 : 0} />
      <AbsoluteFill style={{ background: 'radial-gradient(45% 40% at 50% 46%, rgba(233,184,114,0.45), transparent 70%)' }} />
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', gap: wide ? 46 : 56, padding: `${L.safe.top}px ${L.safe.side}px ${L.safe.bottom}px` }}>
        <Logo size={wide ? 110 : 112} delay={timing.cta.logo} />
        <KineticText lines={[copy.cta.tagline]} size={L.caption * (wide ? 0.95 : 1)} align="center" delay={12} style={{ maxWidth: wide ? 1100 : 780, fontStyle: 'italic' }} />
        <div
          style={{
            marginTop: 10, padding: wide ? '28px 64px' : '34px 72px', borderRadius: 999, background: colors.espresso, color: colors.paper,
            fontFamily: ui, fontSize: wide ? 32 : 38, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 500,
            transform: `scale(${btn * (1 + kick * 0.05)})`,
            boxShadow: `0 20px 40px rgba(59,41,34,0.3), 0 0 0 ${kick * 18}px rgba(233,184,114,${kick * 0.35})`,
          }}
        >
          {copy.cta.button}
        </div>
        <div style={{ fontFamily: ui, fontSize: wide ? 34 : 40, letterSpacing: '0.2em', color: colors.walnut, opacity: url, transform: `translateY(${(1 - url) * 20}px)` }}>
          {copy.cta.url}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
