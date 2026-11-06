import { useCurrentFrame, useVideoConfig } from 'remotion';
import { FeatureStage } from '../components/FeatureStage';
import { Glass, Toast } from '../components/Ui';
import { display, ui } from '../lib/fonts';
import { mix, springAt } from '../lib/motion';
import { beats, colors, copy, screens, springs } from '../video.config';

const STEPS = ['Reserve', 'Made in 10 days', 'Pay on delivery'];

/** Beat 3: the real pre-order steps; ৳ counts up to 300 and the timeline draws itself. */
export function Reserve() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const count = springAt(frame, fps, beats(2), springs.camera);
  const draw = springAt(frame, fps, beats(3), springs.camera);
  return (
    <FeatureStage
      eyebrow="Pre-order in three steps"
      caption={copy.reserve.caption}
      desktop={screens.stepsDesktop}
      mobile={screens.stepsMobile}
      cam={{ desktop: [{ x: 0.5, y: 0.55, scale: 1 }, { x: 0.5, y: 0.68, scale: 1.12 }], mobile: [{ x: 0.5, y: 0.5, scale: 1 }, { x: 0.3, y: 0.62, scale: 1.12 }] }}
      extras={(s) => {
        const wide = s.format === 'wide';
        const story = s.format === 'story';
        const w = wide ? 700 : story ? 860 : 800;
        const left = wide ? s.device.x - 160 : (1080 - w) / 2;
        const top = wide ? s.device.y + s.device.h - 330 : story ? 1150 : 900;
        const appear = springAt(frame, fps, beats(1.5), springs.pop);
        const lineW = w - 120;
        return (
          <>
            <Glass style={{ position: 'absolute', left, top, width: w, padding: '34px 50px 40px', transform: `translateY(${(1 - appear) * 120}px) scale(${mix(0.9, 1, appear)})`, opacity: Math.min(1, appear * 2) }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <div style={{ fontFamily: ui, fontSize: 26, letterSpacing: '0.18em', textTransform: 'uppercase', color: colors.walnut }}>Advance</div>
                <div style={{ fontFamily: display, fontSize: wide ? 96 : 110, color: colors.espresso, lineHeight: 1 }}>
                  ৳{Math.round(copy.reserve.amount * count)}
                </div>
              </div>
              <svg width={lineW} height={90} style={{ marginTop: 22, overflow: 'visible' }}>
                <line x1={10} y1={20} x2={10 + (lineW - 20) * draw} y2={20} stroke={colors.walnut} strokeWidth={4} strokeLinecap="round" />
                {STEPS.map((t, i) => {
                  const x = 10 + ((lineW - 20) * i) / 2;
                  const on = springAt(frame, fps, beats(3) + i * 8, springs.pop);
                  return (
                    <g key={t} transform={`translate(${x} 20)`}>
                      <circle r={13 * on} fill={i === 0 ? colors.glow : colors.paper} stroke={colors.walnut} strokeWidth={4} />
                      <text y={62} textAnchor={i === 0 ? 'start' : i === 2 ? 'end' : 'middle'} x={i === 0 ? -10 : i === 2 ? 10 : 0} fontFamily={ui} fontSize={wide ? 24 : 28} fill={colors.espresso} opacity={on}>
                        {t}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </Glass>
            <Toast
              title={copy.reserve.toast.title}
              text={copy.reserve.toast.text}
              delay={beats(6.5)}
              scale={wide ? 1 : 1.1}
              style={wide ? { right: 90, top: s.device.y - 30 } : { left: (1080 - 680) / 2, top: story ? 700 : 450, width: 680 }}
            />
          </>
        );
      }}
    />
  );
}
