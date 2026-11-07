import { SiteBeat, liftSlots } from '../components/SiteBeat';
import { useLayout } from '../lib/layout';
import { el, page } from '../lib/site';
import { copy, timing } from '../video.config';

const T = timing.bulk;
const it = copy.services.items[2];

/** Section beat "Bulk & corporate": the real page scrolls from the hero to its trust section. */
export function Bulk() {
  const wide = useLayout().format === 'wide';
  const pg = page('bulk', wide ? 'desktop' : 'mobile');
  const trust = el(pg, 'headings', 'Buy with confidence');
  const block = { ...trust, x: 0, y: trust.y - 40, w: pg.width, h: wide ? 300 : 430 };
  return (
    <SiteBeat
      eyebrow={`${it.index} · ${it.name}`}
      caption={it.caption}
      shots={[{ shot: pg, from: 0, scroll: [{ at: T.scroll, to: block.y - (wide ? 200 : 160), dur: 44 }] }]}
      plan={(g) => {
        const [main] = liftSlots(g, block.h / block.w, 1);
        return {
          focus: [{ at: T.push, shot: 0, el: block, zoom: g.wide ? 1.2 : 1.35 }],
          spot: { shot: 0, el: block, at: T.spot, until: T.lift },
          dim: T.lift,
          lifts: [{ at: T.lift, shot: 0, el: block, to: main }],
          callout: { at: T.callout, text: 'Quotes for any quantity', x: main.x + main.w / 2, y: g.wide ? main.y - 6 : main.y + main.h + 6, side: g.wide ? 'top' : 'bottom' },
        };
      }}
    />
  );
}
