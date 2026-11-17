import { useCurrentFrame, useVideoConfig } from 'remotion';
import { FeatureStage, ScreenSwap, target } from '../components/FeatureStage';
import { Cursor, Glass, Tap } from '../components/Ui';
import { ui } from '../lib/fonts';
import { mix, springAt } from '../lib/motion';
import { colors, copy, screens, springs, timing } from '../video.config';

const T = timing.moods;
const CLICK = T.click;

/**
 * Beat 2: the real product page. Desktop: the cursor clicks the site's own dark-mode toggle and
 * the real night theme spreads from it. Phone: a tap on Day/Night does the same.
 */
export function Moods() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const night = springAt(frame, fps, CLICK, springs.camera);
  return (
    <FeatureStage
      eyebrow={copy.moods.label}
      caption={copy.moods.caption}
      desktop={screens.productDesktop}
      mobile={screens.productMobile}
      scroll={{ seq: 'moods', at: 100, dur: 55 }}
      screenOverlay={(s) => {
        const wide = s.format === 'wide';
        const t = target(s, 'themeToggle');
        const ox = wide && t ? t.x : s.screen.w / 2;
        const oy = wide && t ? t.y : s.screen.h;
        const r = night * Math.hypot(s.screen.w, s.screen.h) * 1.05;
        return (
          <>
            <ScreenSwap src={wide ? screens.productNightDesktop : screens.productNightMobile} clip={`circle(${r}px at ${ox}px ${oy}px)`} />
            {wide && t && (
              <Cursor stops={[{ at: T.cursorIn, x: s.screen.w * 0.55, y: s.screen.h * 0.6 }, { at: T.cursorMove, x: t.x, y: t.y, click: CLICK }]} size={36} />
            )}
          </>
        );
      }}
      extras={(s) => {
        if (s.format === 'wide') return null;
        const pillW = 340;
        const left = s.device.x + s.device.w - pillW * 0.62;
        const top = s.device.y + s.device.h * 0.42;
        const appear = springAt(frame, fps, T.pill, springs.pop);
        return (
          <div style={{ position: 'absolute', left, top, transform: `scale(${appear})` }}>
            <Glass style={{ width: pillW, height: 96, borderRadius: 999, position: 'relative', display: 'flex', alignItems: 'center', padding: 9 }}>
              <div
                style={{
                  position: 'absolute', top: 9, bottom: 9, left: 9 + night * (pillW / 2 - 9), width: pillW / 2 - 9,
                  borderRadius: 999, background: mix(0, 1, night) > 0.5 ? colors.espresso : colors.paper, boxShadow: '0 6px 16px rgba(59,41,34,0.2)',
                }}
              />
              {[copy.moods.day, copy.moods.night].map((t, i) => (
                <div key={t} style={{ position: 'relative', flex: 1, textAlign: 'center', fontFamily: ui, fontSize: 32, fontWeight: 500, letterSpacing: '0.08em', color: (i === 1) === night > 0.5 ? (i === 1 ? colors.brass : colors.espresso) : colors.stone }}>
                  {t}
                </div>
              ))}
              <Tap x={pillW * 0.75} y={48} at={CLICK} />
            </Glass>
          </div>
        );
      }}
    />
  );
}
