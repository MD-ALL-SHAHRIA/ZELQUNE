import { useCurrentFrame, useVideoConfig } from 'remotion';
import { FeatureStage, project } from '../components/FeatureStage';
import { Cursor, ProductCard } from '../components/Ui';
import { mix, springAt } from '../lib/motion';
import { beats, copy, screens, springs } from '../video.config';

const CLICK = beats(4);

/** Beat 1: browse the real shop, click a piece, the real product cards lift off the screen. */
export function Find() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cam = {
    desktop: [{ x: 0.5, y: 0.35, scale: 1 }, { x: 0.18, y: 0.98, scale: 1.45 }],
    mobile: [{ x: 0.5, y: 0.3, scale: 1 }, { x: 0.3, y: 0.98, scale: 1.25 }],
  } as const;
  return (
    <FeatureStage
      eyebrow={copy.find.label}
      caption={copy.find.caption}
      desktop={screens.shopDesktop}
      mobile={screens.shopMobile}
      cam={{ desktop: [...cam.desktop], mobile: [...cam.mobile] }}
      camAt={8}
      screenOverlay={(s) => {
        const wide = s.format === 'wide';
        const target = project(wide ? [0.12, 0.9] : [0.27, 0.9], wide ? cam.desktop[1] : cam.mobile[1], s.screen);
        return <Cursor from={[s.screen.w * 0.75, s.screen.h * 0.3]} to={target} moveAt={beats(1.5)} clickAt={CLICK} size={wide ? 40 : 46} />;
      }}
      extras={(s) => {
        const wide = s.format === 'wide';
        const story = s.format === 'story';
        const w = wide ? 290 : story ? 300 : 270;
        const y = wide ? s.device.y + 330 : story ? 1090 : 860;
        const xs = wide ? [s.device.x + 30, s.device.x + 390, s.device.x + 750] : [L(s, w, 0), L(s, w, 1), L(s, w, 2)];
        const rot = [-7, 2, 8];
        return screens.cards.map((src, i) => {
          const p = springAt(frame, fps, CLICK + 6 + i * 4, springs.pop);
          return (
            <ProductCard
              key={src}
              src={src}
              width={w}
              style={{
                position: 'absolute', left: xs[i], top: y + (1 - p) * 260 + (i === 1 ? -40 : 0),
                transform: `rotate(${mix(0, rot[i], p)}deg) scale(${mix(0.5, 1, p)})`, opacity: Math.min(1, p * 2),
              }}
            />
          );
        });
      }}
    />
  );
}

// Three cards spread across a portrait frame.
function L(s: { device: { x: number; w: number } }, w: number, i: number) {
  const center = s.device.x + s.device.w / 2;
  return center - w / 2 + (i - 1) * (w * 1.08);
}
