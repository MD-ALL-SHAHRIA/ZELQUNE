import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { ArchBloom, ArchLine, type ArchBox } from '../components/Arch';
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
  const arch: ArchBox = (() => {
    const [w, h, y] = wide ? [720, 730, 195] : L.format === 'story' ? [860, 860, 470] : [780, 760, 290];
    return { x: (L.w - w) / 2, y, w, h, text: { x: 0, y: 0, w: 0, h: 0, align: 'center' } };
  })();
  const draw = useSpringAt(0, springs.camera);
  const glowIn = useSpringAt(10, springs.soft);
  return (
    <AbsoluteFill>
      {/* Bookend: the arch of light that opened the film draws itself around the logo. */}
      <AbsoluteFill style={{ background: colors.night }} />
      <ArchBloom box={arch} light={glowIn} />
      <ArchLine box={arch} draw={draw} glow={0.85} />
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', gap: wide ? 46 : 56, padding: `${L.safe.top}px ${L.safe.side}px ${L.safe.bottom}px` }}>
        <Logo size={wide ? 110 : 112} delay={timing.cta.logo} color={colors.paper} />
        <KineticText lines={[copy.cta.tagline]} size={L.caption * (wide ? 0.95 : 1)} align="center" delay={12} color={colors.cream} style={{ maxWidth: wide ? 620 : 700, fontStyle: 'italic' }} />
        <div
          style={{
            marginTop: 10, padding: wide ? '28px 64px' : '34px 72px', borderRadius: 999, background: colors.glow, color: colors.espresso,
            fontFamily: ui, fontSize: wide ? 32 : 38, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 500,
            transform: `scale(${btn * (1 + kick * 0.05)})`,
            boxShadow: `0 20px 40px rgba(59,41,34,0.3), 0 0 0 ${kick * 18}px rgba(233,184,114,${kick * 0.35})`,
          }}
        >
          {copy.cta.button}
        </div>
        <div style={{ fontFamily: ui, fontSize: wide ? 34 : 40, letterSpacing: '0.2em', color: colors.brass, opacity: url, transform: `translateY(${(1 - url) * 20}px)` }}>
          {copy.cta.url}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
