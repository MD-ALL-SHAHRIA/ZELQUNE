import { Crop } from '../components/Glass';
import { SiteBeat, liftSlots } from '../components/SiteBeat';
import { useLayout } from '../lib/layout';
import { el, grow, page, union } from '../lib/site';
import { copy, timing } from '../video.config';

const T = timing.design;
const it = copy.services.items[0];

/** Section beat "Interior design": a real menu interaction leads to the design page; the hero lifts out. */
export function Design() {
  const wide = useLayout().format === 'wide';
  const dev = wide ? 'desktop' : 'mobile';
  const top = page('home-top', dev);
  const menu = page('home-menu', dev);
  const design = page('design-top', dev);
  const menuBtn = menu.buttons[0];
  const link = el(menu, 'nav', 'Interior Design');
  const heading = design.headings[0];
  const cta = (design.buttons ?? []).find((b) => /consultation/i.test(b.text));
  const hero = grow(cta ? union(heading, cta) : heading, 24);
  return (
    <SiteBeat
      eyebrow={`${it.index} · ${it.name}`}
      caption={it.caption}
      shots={[
        { shot: top, from: 0 },
        { shot: menu, from: T.menuOpen, enter: 'drawer' },
        { shot: design, from: T.page, enter: 'wipe' },
      ]}
      plan={(g) => {
        const [main] = liftSlots(g, hero.h / hero.w, 1);
        return {
          open: { rx: 6, ry: g.wide ? -10 : 8 },
          focus: [
            ...(g.wide ? [{ at: 4, dur: 20, shot: 0, el: grow(menuBtn, 120, 60), zoom: 1.35 }] : []),
            { at: T.page - 2, dur: 20, shot: 2, el: { text: '', x: 0, y: 0, w: design.width, h: design.height }, zoom: 1 },
            { at: T.push, shot: 2, el: hero, zoom: g.wide ? 1.5 : 1.3 },
          ],
          cursor: { shots: [0, 1], from: [top.width * 0.5, top.height * 0.5], stops: [{ at: 6, el: menuBtn, click: T.menuClick }, { at: 28, el: link, click: T.linkClick }] },
          dim: T.lift,
          lifts: [{ at: T.lift, shot: 2, el: hero, to: main, content: (w: number) => <Crop src={design.src} imgW={design.width} imgH={design.height} rect={hero} width={w} /> }],
          callout: { at: T.callout, text: 'Planned around your space', x: main.x + main.w / 2, y: g.wide ? main.y - 6 : main.y + main.h + 6, side: g.wide ? 'top' : 'bottom' },
        };
      }}
    />
  );
}
