import { SiteBeat, liftSlots } from '../components/SiteBeat';
import { useLayout } from '../lib/layout';
import { grow, page, union } from '../lib/site';
import { copy, timing } from '../video.config';

const T = timing.construction;
const it = copy.services.items[1];

/** Section beat "Construction": the hero headline, then the real projects lift out and fan. */
export function Construction() {
  const wide = useLayout().format === 'wide';
  const dev = wide ? 'desktop' : 'mobile';
  const hero = page('construction-top', dev);
  const build = page('construction-build', dev);
  const heading = grow(hero.headings[0], 20);
  // Only project images fully inside the captured screen (the phone shows a carousel).
  const imgs = build.images.filter((i) => i.x >= 0 && i.x + i.w <= build.width + 2).slice(0, 3);
  return (
    <SiteBeat
      eyebrow={`${it.index} · ${it.name}`}
      caption={it.caption}
      tone="warm"
      shots={[{ shot: hero, from: 0 }, { shot: build, from: T.page, enter: 'wipe' }]}
      plan={(g) => {
        const slots = liftSlots(g, imgs[0].h / imgs[0].w, imgs.length);
        return {
          focus: [
            { at: T.push, shot: 0, el: heading, zoom: g.wide ? 1.45 : 1.25 },
            { at: T.push2, shot: 1, el: union(...imgs), zoom: g.wide ? 1.15 : 1.3 },
          ],
          dim: T.lift,
          lifts: imgs.map((im, i) => ({ at: T.lift + i * T.fanStagger, shot: 1, el: im, to: slots[i], tilt: [4, i === 0 ? -6 : i === 1 ? (g.wide ? -14 : 12) : -12] as [number, number] })).reverse(),
          callout: { at: T.callout, text: 'Homes to restaurants', x: slots[0].x + slots[0].w / 2, y: g.wide ? slots[0].y - 6 : slots[0].y + slots[0].h + 6, side: g.wide ? 'top' : 'bottom' },
        };
      }}
    />
  );
}
