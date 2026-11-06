import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { FeatureStage, project } from '../components/FeatureStage';
import { Cursor, Glass } from '../components/Ui';
import { ui } from '../lib/fonts';
import { mix, springAt } from '../lib/motion';
import { beats, colors, copy, screens, springs } from '../video.config';

const CLICK = beats(4.5);

/** Beat 2: the real product page; one click turns the vase into a glowing lamp. */
export function Moods() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const night = springAt(frame, fps, CLICK + 2, springs.soft);
  const cam = {
    desktop: [{ x: 0.5, y: 0.5, scale: 1 }, { x: 0.32, y: 0.55, scale: 1.5 }],
    mobile: [{ x: 0.5, y: 0.35, scale: 1 }, { x: 0.5, y: 0.38, scale: 1.18 }],
  } as const;
  return (
    <FeatureStage
      eyebrow={copy.moods.label}
      caption={copy.moods.caption}
      desktop={screens.productDesktop}
      mobile={screens.productMobile}
      cam={{ desktop: [...cam.desktop], mobile: [...cam.mobile] }}
      camAt={6}
      screenOverlay={(s) => {
        const wide = s.format === 'wide';
        const [gx, gy] = project(wide ? [0.33, 0.5] : [0.45, 0.45], wide ? cam.desktop[1] : cam.mobile[1], s.screen);
        return (
          <AbsoluteFill>
            <AbsoluteFill style={{ background: `rgba(16,11,8,${0.78 * night})`, mixBlendMode: 'multiply' }} />
            <AbsoluteFill
              style={{
                background: `radial-gradient(${s.screen.w * 0.22}px ${s.screen.w * 0.3}px at ${gx}px ${gy}px, rgba(242,190,120,${0.95 * night}), rgba(233,184,114,${0.35 * night}) 45%, transparent 70%)`,
                mixBlendMode: 'screen',
              }}
            />
          </AbsoluteFill>
        );
      }}
      extras={(s) => {
        const wide = s.format === 'wide';
        const scale = wide ? 1 : 1.15;
        const pillW = 300 * scale;
        const left = wide ? s.device.x + s.device.w - pillW - 60 : s.device.x + s.device.w / 2 - pillW / 2;
        const top = wide ? s.device.y - 40 : s.device.y + s.device.h - 120;
        const appear = springAt(frame, fps, beats(2), springs.pop);
        return (
          <div style={{ position: 'absolute', left, top, transform: `scale(${appear})` }}>
            <Glass style={{ width: pillW, height: 84 * scale, borderRadius: 999, position: 'relative', display: 'flex', alignItems: 'center', padding: 8 * scale }}>
              <div
                style={{
                  position: 'absolute', top: 8 * scale, bottom: 8 * scale, left: 8 * scale + night * (pillW / 2 - 8 * scale), width: pillW / 2 - 8 * scale,
                  borderRadius: 999, background: night > 0.5 ? colors.espresso : colors.paper, boxShadow: '0 6px 16px rgba(59,41,34,0.2)',
                }}
              />
              {[copy.moods.day, copy.moods.night].map((t, i) => (
                <div
                  key={t}
                  style={{
                    position: 'relative', flex: 1, textAlign: 'center', fontFamily: ui, fontSize: 28 * scale, fontWeight: 500, letterSpacing: '0.08em',
                    color: i === 1 ? mix(0, 1, night) > 0.5 ? colors.brass : colors.stone : night > 0.5 ? colors.stone : colors.espresso,
                  }}
                >
                  {t}
                </div>
              ))}
              <Cursor from={[-160, 160]} to={[pillW * 0.72, 54 * scale]} moveAt={beats(2.5)} clickAt={CLICK} size={44} />
            </Glass>
          </div>
        );
      }}
    />
  );
}
