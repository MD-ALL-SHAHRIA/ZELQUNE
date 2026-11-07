import { Img, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Crop } from '../components/Glass';
import { SiteBeat, liftSlots } from '../components/SiteBeat';
import { Glass, Tap } from '../components/Ui';
import targets from '../../assets/screens/targets.json';
import { ui } from '../lib/fonts';
import { useLayout } from '../lib/layout';
import { springAt } from '../lib/motion';
import { page, viewShot, type El } from '../lib/site';
import { colors, copy, screens, springs, timing } from '../video.config';

const T = timing.moods;

/**
 * Section beat "Product": push onto the real product, then to the site's own dark-mode toggle; one
 * click and the real night theme spreads from it; the glowing panel lifts out on glass.
 */
export function Moods() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const L = useLayout();
  const wide = L.format === 'wide';
  const dev = wide ? 'desktop' : 'mobile';
  const vw = wide ? 1440 : 390;
  const vh = wide ? 900 : 844;
  const day = viewShot(wide ? screens.productDesktop : screens.productMobile, dev, page('product', dev));
  const nightSrc = wide ? screens.productNightDesktop : screens.productNightMobile;
  const image = day.images[0];
  const t = (targets as Record<string, Record<string, { x: number; y: number; w: number; h: number; left: number } | null>>).desktop.themeToggle!;
  const toggle: El = { text: 'toggle', x: t.left * vw, y: (t.y - t.h / 2) * vh, w: t.w * vw, h: t.h * vh };
  const night = springAt(frame, fps, T.click, springs.camera);
  const origin = wide ? [toggle.x + toggle.w / 2, toggle.y + toggle.h / 2] : [vw / 2, vh];
  const whole: El = { text: 'page', x: 0, y: 0, w: vw, h: vh };
  return (
    <SiteBeat
      eyebrow={copy.moods.label}
      caption={copy.moods.caption}
      shots={[{ shot: day, from: 0 }]}
      plan={(g) => {
        const [main] = liftSlots(g, image.h / image.w, 1);
        return {
          focus: [
            { at: T.push, shot: 0, el: image, zoom: g.wide ? 1.45 : 1.35 },
            ...(g.wide ? [{ at: T.toggle, shot: 0, el: toggle, zoom: 2.6 }] : []),
            { at: T.pull, dur: 30, shot: 0, el: whole, zoom: g.wide ? 1.12 : 1.05 },
          ],
          cursor: g.wide ? { shots: [0], from: [image.x + image.w, image.y + 120], stops: [{ at: T.cursorMove, el: toggle, click: T.click }] } : undefined,
          dim: T.lift,
          lifts: [{ at: T.lift, shot: 0, el: image, to: main, content: (w: number) => <Crop src={nightSrc} imgW={vw} imgH={vh} rect={image} width={w} /> }],
          callout: { at: T.callout, text: 'Safe 5V warm glow', x: main.x + main.w / 2, y: g.wide ? main.y - 6 : main.y + main.h + 6, side: g.wide ? 'top' : 'bottom' },
          // The real night theme, spreading from the toggle (or from the tap on phones).
          pageOverlay: () => (
            <Img
              src={staticFile(nightSrc)}
              style={{ position: 'absolute', left: 0, top: 0, width: vw, height: vh, clipPath: `circle(${night * Math.hypot(vw, vh) * 1.05}px at ${origin[0]}px ${origin[1]}px)` }}
            />
          ),
          extras: g.wide ? null : <DayNightPill g={g} night={night} />,
        };
      }}
    />
  );
}

/** Phones have no header toggle: a Day/Night switch is tapped instead. */
function DayNightPill({ g, night }: { g: { W: number; story: boolean }; night: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const appear = springAt(frame, fps, T.pill, springs.pop) - springAt(frame, fps, T.lift - 4, springs.soft);
  const pillW = 340;
  if (appear <= 0.01) return null;
  return (
    <div style={{ position: 'absolute', left: (g.W - pillW) / 2, top: g.story ? 1600 - 130 : 1350 - 200, transform: `scale(${appear})`, opacity: appear }}>
      <Glass style={{ width: pillW, height: 96, borderRadius: 999, position: 'relative', display: 'flex', alignItems: 'center', padding: 9 }}>
        <div style={{ position: 'absolute', top: 9, bottom: 9, left: 9 + night * (pillW / 2 - 9), width: pillW / 2 - 9, borderRadius: 999, background: night > 0.5 ? colors.espresso : colors.paper, boxShadow: '0 6px 16px rgba(59,41,34,0.2)' }} />
        {[copy.moods.day, copy.moods.night].map((t, i) => (
          <div key={t} style={{ position: 'relative', flex: 1, textAlign: 'center', fontFamily: ui, fontSize: 32, fontWeight: 500, letterSpacing: '0.08em', color: (i === 1) === night > 0.5 ? (i === 1 ? colors.brass : colors.espresso) : colors.stone }}>{t}</div>
        ))}
        <Tap x={pillW * 0.75} y={48} at={T.click} />
      </Glass>
    </div>
  );
}
