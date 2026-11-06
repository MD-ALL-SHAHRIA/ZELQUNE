import { useCurrentFrame, useVideoConfig } from 'remotion';
import { FeatureStage, project } from '../components/FeatureStage';
import { Cursor, Glass, Toast } from '../components/Ui';
import { ui } from '../lib/fonts';
import { mix, springAt } from '../lib/motion';
import { beats, colors, copy, screens, springs } from '../video.config';

const CLICK = beats(5);

/** Beat 4: the real tracking page; the order code types in, one click, and it is on its way. */
export function Deliver() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const typed = Math.round(copy.deliver.code.length * springAt(frame, fps, beats(1.5), springs.camera));
  const cam = {
    desktop: [{ x: 0.3, y: 0.4, scale: 1 }, { x: 0.45, y: 0.8, scale: 1.35 }],
    mobile: [{ x: 0.5, y: 0.4, scale: 1 }, { x: 0.5, y: 0.7, scale: 1.12 }],
  } as const;
  return (
    <FeatureStage
      eyebrow="Delivered to all 64 districts"
      caption={copy.deliver.caption}
      desktop={screens.trackDesktop}
      mobile={screens.trackMobile}
      cam={{ desktop: [...cam.desktop], mobile: [...cam.mobile] }}
      camAt={4}
      screenOverlay={(s) => {
        const wide = s.format === 'wide';
        const target = project(wide ? [0.78, 0.905] : [0.5, 0.85], wide ? cam.desktop[1] : cam.mobile[1], s.screen);
        return <Cursor from={[s.screen.w * 0.2, s.screen.h * 0.35]} to={target} moveAt={beats(3)} clickAt={CLICK} size={wide ? 40 : 46} />;
      }}
      extras={(s) => {
        const wide = s.format === 'wide';
        const story = s.format === 'story';
        const appear = springAt(frame, fps, beats(0.8), springs.pop);
        const w = wide ? 520 : 700;
        const left = wide ? s.device.x + s.device.w - w - 30 : (1080 - w) / 2;
        const top = wide ? s.device.y + 40 : story ? 1290 : 1000;
        const progress = springAt(frame, fps, CLICK + 6, springs.camera);
        return (
          <>
            <Glass style={{ position: 'absolute', left, top, width: w, padding: '30px 40px', transform: `scale(${mix(0.85, 1, appear)})`, opacity: Math.min(1, appear * 2) }}>
              <div style={{ fontFamily: ui, fontSize: 24, letterSpacing: '0.18em', textTransform: 'uppercase', color: colors.walnut }}>Order code</div>
              <div style={{ fontFamily: ui, fontSize: wide ? 50 : 56, letterSpacing: '0.08em', color: colors.espresso, marginTop: 8, fontWeight: 500 }}>
                {copy.deliver.code.slice(0, typed)}
                <span style={{ opacity: frame % 16 < 8 && typed < copy.deliver.code.length ? 1 : 0, color: colors.walnut }}>|</span>
              </div>
              <div style={{ marginTop: 22, height: 10, borderRadius: 999, background: colors.line, overflow: 'hidden' }}>
                <div style={{ width: `${mix(8, 86, progress)}%`, height: '100%', borderRadius: 999, background: `linear-gradient(90deg, ${colors.walnut}, ${colors.glow})` }} />
              </div>
            </Glass>
            <Toast
              title={copy.deliver.toast.title}
              text={copy.deliver.toast.text}
              delay={CLICK + 10}
              scale={wide ? 1 : 1.1}
              style={wide ? { right: 90, top: s.device.y + s.device.h - 140 } : { left: (1080 - 680) / 2, top: story ? 700 : 450, width: 680 }}
            />
          </>
        );
      }}
    />
  );
}
