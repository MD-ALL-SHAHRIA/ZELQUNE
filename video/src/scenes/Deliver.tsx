import { Img, staticFile, useCurrentFrame } from 'remotion';
import targets from '../../assets/screens/targets.json';
import { Crop } from '../components/Glass';
import { SiteBeat, liftSlots } from '../components/SiteBeat';
import { Toast } from '../components/Ui';
import { useLayout } from '../lib/layout';
import { typedCount, typingSchedule } from '../lib/typing';
import { grow, page, union, viewShot, type El } from '../lib/site';
import { colors, copy, screens, timing } from '../video.config';

const T = timing.deliver;
const schedule = typingSchedule();
type Norm = { x: number; y: number; w: number; h: number; left: number };

/** Section beat "Track your order": the camera dives into the real form; it types, then Track. */
export function Deliver() {
  const frame = useCurrentFrame();
  const wide = useLayout().format === 'wide';
  const dev = wide ? 'desktop' : 'mobile';
  const vw = wide ? 1440 : 390;
  const vh = wide ? 900 : 844;
  const shot = viewShot(wide ? screens.trackDesktop : screens.trackMobile, dev, page('track', dev));
  const filled = wide ? screens.trackFilledDesktop : screens.trackFilledMobile;
  const tg = (targets as Record<string, Record<string, Norm | null>>)[dev];
  const box = (n: string): El => {
    const t = tg[n]!;
    return { text: n, x: t.left * vw, y: (t.y - t.h / 2) * vh, w: t.w * vw, h: t.h * vh };
  };
  const [order, phone, button] = [box('orderInput'), box('phoneInput'), box('trackButton')];
  const form = grow(union(order, phone, button), 16, 26);
  return (
    <SiteBeat
      eyebrow="Delivered to all 64 districts"
      caption={copy.deliver.caption}
      shots={[{ shot, from: 0 }]}
      plan={(g) => {
        const [main] = liftSlots(g, form.h / form.w, 1);
        return {
          focus: [
            { at: T.push, shot: 0, el: form, zoom: g.wide ? 1.55 : 1.25 },
            { at: T.buttonPush, dur: 24, shot: 0, el: g.wide ? button : form, zoom: g.wide ? 2.1 : 1.45 },
          ],
          cursor: { shots: [0], from: [vw * 0.6, vh * 0.35], stops: [{ at: T.cursorIn + 6, el: order, click: T.focus }, { at: T.buttonMove, el: button, click: T.click }] },
          dim: T.lift,
          lifts: [{ at: T.lift, shot: 0, el: form, to: main, content: (w: number) => <Crop src={filled} imgW={vw} imgH={vh} rect={form} width={w} /> }],
          extras: (
            <Toast
              title={copy.deliver.toast.title}
              text={copy.deliver.toast.text}
              delay={T.toast}
              scale={g.wide ? 1 : 1.1}
              style={g.wide ? { right: 90, top: 90 } : { left: 110, top: g.story ? 640 : 410 }}
            />
          ),
          // Per-character typing into the real fields, with a caret.
          pageOverlay: () =>
            (['orderText', 'phoneText'] as const).map((name, i) => {
              const t = tg[name];
              if (!t) return null;
              const f = schedule.fields[i];
              const n = typedCount(frame, f.start, f.text.length, schedule.perChar);
              const left = t.left * vw;
              const top = (t.y - t.h / 2) * vh;
              const x1 = left + (t.w * vw * n) / f.text.length;
              const typing = frame >= f.start - 4 && frame < f.start + f.text.length * schedule.perChar + 10;
              return (
                <div key={name}>
                  {n > 0 && (
                    <div style={{ position: 'absolute', left: 0, top: 0, width: vw, height: vh, clipPath: `polygon(${left - 2}px ${top + t.h * vh * 0.08}px, ${x1 + 1}px ${top + t.h * vh * 0.08}px, ${x1 + 1}px ${top + t.h * vh * 0.92}px, ${left - 2}px ${top + t.h * vh * 0.92}px)` }}>
                      <Img src={staticFile(filled)} style={{ width: vw, height: vh }} />
                    </div>
                  )}
                  {typing && frame % 14 < 9 && <div style={{ position: 'absolute', left: x1 + 1, top: top + t.h * vh * 0.28, width: 1.2, height: t.h * vh * 0.44, background: colors.espresso }} />}
                </div>
              );
            }),
        };
      }}
    />
  );
}
