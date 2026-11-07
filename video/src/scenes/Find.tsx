import { Img, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Crop } from '../components/Glass';
import { SiteBeat, liftSlots } from '../components/SiteBeat';
import { useLayout } from '../lib/layout';
import { springAt } from '../lib/motion';
import { page } from '../lib/site';
import { copy, springs, timing } from '../video.config';

const T = timing.find;

/** Section beat "Shop": scroll to the real grid, push in, real hover, click, the card lifts out. */
export function Find() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const wide = useLayout().format === 'wide';
  const pg = page('shop', wide ? 'desktop' : 'mobile');
  const card = pg.cards[0];
  const scroll = card.y - (wide ? 140 : 110);
  return (
    <SiteBeat
      eyebrow={copy.find.label}
      caption={copy.find.caption}
      shots={[{ shot: pg, from: 0, scroll: [{ at: T.scroll, to: scroll, dur: 50 }] }]}
      plan={(g) => {
        const zoom = g.wide ? 1.8 : g.story ? 1.9 : 1.65;
        const [main, ...fans] = liftSlots(g, card.h / card.w, 3);
        return {
          focus: [
            { at: T.push, shot: 0, el: card, zoom },
            { at: T.lift, dur: 40, shot: 0, el: card, zoom: zoom * 0.86 },
          ],
          cursor: { shots: [0], from: [card.x + card.w * 2.1, card.y - 60], stops: [{ at: T.cursorMove, el: card, click: T.click }] },
          spot: { shot: 0, el: card, at: T.spot, until: T.lift },
          dim: T.lift,
          lifts: [
            ...fans.map((to, k) => ({ at: T.cards + k * T.cardStagger, shot: 0, el: pg.cards[k + 1], to, tilt: [4, g.wide ? -14 : k ? -12 : 12] as [number, number] })),
            {
              at: T.lift, shot: 0, el: card, to: main,
              content: g.wide ? (w: number) => <Crop src="site/shop-card-1-hover.png" imgW={card.w} imgH={card.h} rect={{ x: 0, y: 0, w: card.w, h: card.h }} width={w} /> : undefined,
            },
          ],
          callout: { at: T.callout, text: 'Made after you order', x: main.x + main.w / 2, y: g.wide ? main.y - 6 : main.y + main.h + 6, side: g.wide ? 'top' : 'bottom' },
          // The real hover state, laid exactly over the first card (desktop only).
          pageOverlay: () =>
            g.wide ? (
              <Img src={staticFile('site/shop-card-1-hover.png')} style={{ position: 'absolute', left: card.x, top: card.y, width: card.w, height: card.h, opacity: springAt(frame, fps, T.hover, springs.soft) }} />
            ) : null,
        };
      }}
    />
  );
}
