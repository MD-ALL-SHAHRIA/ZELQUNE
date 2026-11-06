import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { Backdrop } from '../components/Backdrop';
import { KineticText } from '../components/Type';
import { Glass } from '../components/Ui';
import { display, ui } from '../lib/fonts';
import { useLayout } from '../lib/layout';
import { mix, springAt } from '../lib/motion';
import { colors, copy, springs, timing } from '../video.config';

const T = timing.proof;

/** 34–39 s: the real numbers count up on glass cards. */
export function Proof() {
  const L = useLayout();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const wide = L.format === 'wide';
  const cols = wide ? 4 : 2;
  const cardW = wide ? 360 : 420;
  const cardH = L.format === 'story' ? 330 : wide ? 300 : 280;
  return (
    <AbsoluteFill>
      <Backdrop tone="dark" />
      <AbsoluteFill
        style={{
          padding: `${L.safe.top + (L.format === 'story' ? 80 : 40)}px ${L.safe.side}px ${L.safe.bottom}px`,
          alignItems: 'center', justifyContent: 'center', gap: wide ? 80 : 70,
        }}
      >
        <KineticText
          lines={copy.proof.lines}
          accentLine={1}
          size={L.caption * (wide ? 1.15 : 1.2)}
          color={colors.paper}
          align="center"
          delay={2}
        />
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, ${cardW}px)`, gap: 32 }}>
          {copy.proof.stats.map((s, i) => {
            const p = springAt(frame, fps, T.cards + i * T.cardStagger, springs.pop);
            const n = springAt(frame, fps, T.count + i * T.cardStagger, springs.camera);
            return (
              <Glass
                key={s.label}
                dark
                style={{
                  height: cardH, padding: 40, display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                  transform: `translateY(${(1 - p) * 80}px) scale(${mix(0.85, 1, p)})`, opacity: Math.min(1, p * 2),
                }}
              >
                <div style={{ fontFamily: display, fontSize: wide ? 130 : 140, lineHeight: 1, color: colors.glow }}>
                  {s.prefix}
                  {Math.round(s.value * n)}
                  <span style={{ fontSize: '0.5em' }}>{s.suffix}</span>
                </div>
                <div style={{ fontFamily: ui, fontSize: wide ? 28 : 32, color: colors.cream, letterSpacing: '0.04em' }}>{s.label}</div>
              </Glass>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
