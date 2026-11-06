import { useCurrentFrame, useVideoConfig } from 'remotion';
import { FeatureStage, target } from '../components/FeatureStage';
import { Cursor, ProductCard, Tap } from '../components/Ui';
import { mix, springAt } from '../lib/motion';
import { beats, copy, screens, springs } from '../video.config';

const CLICK = beats(4);

/** Beat 1: the real shop; the cursor clicks the first real product card and the cards lift off. */
export function Find() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <FeatureStage
      eyebrow={copy.find.label}
      caption={copy.find.caption}
      desktop={screens.shopDesktop}
      mobile={screens.shopMobile}
      screenOverlay={(s) => {
        const t = target(s, 'firstCard');
        if (!t) return null;
        if (s.format !== 'wide') return <Tap x={t.x} y={t.y} at={CLICK} />;
        return <Cursor stops={[{ at: beats(1), x: s.screen.w * 0.8, y: s.screen.h * 0.25 }, { at: beats(1.8), x: t.x, y: t.y, click: CLICK }]} size={38} />;
      }}
      extras={(s) => {
        const wide = s.format === 'wide';
        const story = s.format === 'story';
        const w = wide ? 280 : story ? 300 : 270;
        const y = wide ? s.device.y + s.device.h - 330 : story ? 1090 : 860;
        const center = s.device.x + s.device.w / 2;
        const xs = [-1, 0, 1].map((k) => center - w / 2 + k * w * (wide ? 1.25 : 1.08));
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
