import { useCurrentFrame, useVideoConfig } from 'remotion';
import { SiteBeat } from '../components/SiteBeat';
import { Glass, Toast } from '../components/Ui';
import type { Rect } from '../components/Glass';
import { display, ui } from '../lib/fonts';
import { useLayout } from '../lib/layout';
import { springAt } from '../lib/motion';
import { grow, page, union } from '../lib/site';
import { colors, copy, springs, timing } from '../video.config';

const T = timing.reserve;

/** Section beat "How pre-order works": the real steps, spotlit, then lifted out as a glass cascade. */
export function Reserve() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const wide = useLayout().format === 'wide';
  const pg = page('home-values', wide ? 'desktop' : 'mobile');
  const titles = ['Reserve with', 'We make yours', 'Pay the rest'].flatMap((t) => (pg.texts ?? []).filter((e) => e.text.startsWith(t)).slice(0, 1));
  // A step = its title plus the line under it.
  const steps = titles.map((t) => ({ ...grow(t, 8), h: t.h + (wide ? 70 : 62) }));
  const row = union(...steps);
  const count = springAt(frame, fps, T.count, springs.camera);
  return (
    <SiteBeat
      eyebrow="Pre-order in three steps"
      caption={copy.reserve.caption}
      shots={[{ shot: pg, from: 0 }]}
      plan={(g) => {
        const w = g.wide ? 620 : g.story ? 720 : 640;
        const ratio = steps[0].h / steps[0].w;
        const h = w * ratio;
        // Cascade: step 1 in front, the next ones stacked below with parallax.
        const slots: Rect[] = steps.map((_, i) => ({ x: g.anchor.ax - w / 2 + i * (g.wide ? 46 : 0), y: g.anchor.ay - h * 1.1 + i * (h + 26), w, h }));
        const counterY = slots[0].y - (g.wide ? 150 : 170);
        return {
          focus: [{ at: T.push, shot: 0, el: g.wide ? row : steps[0], zoom: g.wide ? 1.25 : 1.6 }],
          spot: { shot: 0, el: steps[0], at: T.spot, until: T.lift },
          dim: T.lift,
          lifts: steps.map((s, i) => ({ at: T.lift + i * T.fanStagger, shot: 0, el: s, to: slots[i], tilt: [3, g.wide ? -8 : 0] as [number, number] })).reverse(),
          callout: { at: T.callout, text: 'Rest paid on delivery', x: slots[slots.length - 1].x + w / 2, y: slots[slots.length - 1].y + h + 30, side: 'bottom' },
          extras: (
            <>
              <Glass
                style={{
                  position: 'absolute', left: g.anchor.ax - 170, top: counterY, width: 340, padding: '18px 30px', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
                  transform: `scale(${springAt(frame, fps, T.count - 6, springs.pop)})`,
                }}
              >
                <span style={{ fontFamily: ui, fontSize: 22, letterSpacing: '0.18em', textTransform: 'uppercase', color: colors.walnut }}>Advance</span>
                <span style={{ fontFamily: display, fontSize: 76, lineHeight: 1, color: colors.espresso }}>৳{Math.round(copy.reserve.amount * count)}</span>
              </Glass>
              <Toast
                title={copy.reserve.toast.title}
                text={copy.reserve.toast.text}
                delay={T.toast}
                scale={g.wide ? 1 : 1.1}
                style={g.wide ? { right: 90, top: 90 } : { left: 110, top: g.story ? 640 : 410 }}
              />
            </>
          ),
        };
      }}
    />
  );
}
