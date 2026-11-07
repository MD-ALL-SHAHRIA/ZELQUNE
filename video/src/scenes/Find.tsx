import type { ReactNode } from 'react';
import { CameraMotionBlur } from '@remotion/motion-blur';
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Backdrop } from '../components/Backdrop';
import { Camera, PageScreen, cameraAt, onScreen, project, type CamKey } from '../components/Camera';
import { Laptop, Phone, phoneWidth } from '../components/Devices';
import { Callout, Crop, LiftOut, Spotlight, type Rect } from '../components/Glass';
import { Eyebrow, KineticText } from '../components/Type';
import { Cursor } from '../components/Ui';
import { useLayout } from '../lib/layout';
import { mix, springAt } from '../lib/motion';
import { page } from '../lib/site';
import { colors, copy, springs, timing } from '../video.config';

const T = timing.find;

/**
 * Beat 1 (website section): the full Shop page on a tilted device. The camera scrolls down to the
 * real product grid, pushes in on the first card, the cursor hovers (real hover state) and clicks,
 * then the card lifts off the page on glass with two more fanning behind it.
 */
export function Find() {
  const L = useLayout();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const wide = L.format === 'wide';
  const story = L.format === 'story';
  const pg = page('shop', wide ? 'desktop' : 'mobile');
  const card = pg.cards[0];

  // Device geometry on the stage (frame px at camera scale 1).
  let screen: { x: number; y: number; w: number; h: number };
  let device: ReactNode;
  const scrollTarget = card.y - (wide ? 140 : 110);
  const scroll = mix(0, scrollTarget, springAt(frame, fps, T.scroll, springs.camera));
  const content = (sw: number) => (
    <PageScreen src={pg.src} pageWidth={pg.width} screenWidth={sw} scroll={scroll}>
      {/* Real hover state of the first card, laid exactly over it. */}
      <Img
        src={staticFile('site/shop-card-1-hover.png')}
        style={{ position: 'absolute', left: card.x, top: card.y, width: card.w, height: card.h, opacity: wide ? springAt(frame, fps, T.hover, springs.soft) : 0 }}
      />
      <Cursor
        stops={[
          { at: T.cursorIn, x: card.x + card.w * 2.1, y: card.y - 60 },
          { at: T.cursorMove, x: card.x + card.w * 0.55, y: card.y + card.h * 0.45, click: T.click },
        ]}
        size={wide ? 26 : 20}
      />
    </PageScreen>
  );
  if (wide) {
    const w = 1180;
    const pad = w * 0.022;
    const x = L.w - L.safe.side - w + 60;
    const sw = w - pad * 2;
    const y = (L.h - (sw / 1.6 + pad * 2.2 + w * 0.026)) / 2;
    screen = { x: x + pad, y: y + pad, w: sw, h: sw / 1.6 };
    device = <div style={{ position: 'absolute', left: x, top: y }}><Laptop src="" width={w} content={content(sw)} /></div>;
  } else {
    const h = story ? 1150 : 900;
    const top = story ? 640 : 400;
    const w = phoneWidth(h);
    const pad = h * 0.016;
    const x = (L.w - w) / 2;
    screen = { x: x + pad, y: top + pad, w: w - 2 * pad, h: h - 2 * pad };
    device = <div style={{ position: 'absolute', left: x, top }}><Phone src="" height={h} content={content(w - 2 * pad)} /></div>;
  }

  // Camera: wide & tilted → push in on the card → ease back a little as it lifts out.
  const c0 = onScreen(card, screen, pg.width, scrollTarget);
  const anchor = wide ? { ax: L.w * 0.6, ay: L.h * 0.53 } : { ax: L.w / 2, ay: story ? 1130 : 800 };
  const zoom = wide ? 1.8 : story ? 1.9 : 1.65;
  const keys: CamKey[] = [
    { at: 0, x: L.w / 2, y: L.h / 2, scale: 1, rx: 8, ry: wide ? -14 : 12 },
    { at: T.push, dur: 34, x: c0.x + c0.w / 2, y: c0.y + c0.h / 2, scale: zoom, ...anchor },
    { at: T.lift, dur: 40, x: c0.x + c0.w / 2, y: c0.y + c0.h / 2, scale: zoom * 0.86, ...anchor },
  ];
  const cam = cameraAt(frame, fps, keys, L.w, L.h);
  const [px, py] = project(cam, c0.x, c0.y);
  const cardOnFrame: Rect = { x: px, y: py, w: c0.w * cam.scale, h: c0.h * cam.scale };
  const lift = springAt(frame, fps, T.lift, springs.soft);

  // Lift-out targets (frame px).
  const mainW = wide ? 570 : story ? 500 : 400;
  const ratio = card.h / card.w;
  const main: Rect = { x: anchor.ax - mainW / 2, y: anchor.ay - (mainW * ratio) / 2, w: mainW, h: mainW * ratio };
  const fanW = mainW * 0.78;
  const fan: Rect[] = wide
    ? [{ x: main.x + mainW * 0.62, y: main.y + 50, w: fanW, h: fanW * ratio }, { x: main.x + mainW * 1.05, y: main.y + 100, w: fanW * 0.9, h: fanW * 0.9 * ratio }]
    : [{ x: main.x - fanW * 0.55, y: main.y + 60, w: fanW, h: fanW * ratio }, { x: main.x + mainW - fanW * 0.45, y: main.y + 60, w: fanW, h: fanW * ratio }];
  const crop = (i: number) => (w: number) => {
    const e = pg.cards[i];
    return <Crop src={pg.src} imgW={pg.width} imgH={pg.height} rect={{ x: e.x, y: e.y, w: e.w, h: e.h }} width={w} />;
  };
  const fanFrom = (i: number): Rect => {
    const o = onScreen(pg.cards[i], screen, pg.width, scrollTarget);
    const [fx, fy] = project(cam, o.x, o.y);
    return { x: fx, y: fy, w: o.w * cam.scale, h: o.h * cam.scale };
  };

  return (
    <AbsoluteFill>
      <Backdrop tone="paper" />
      <AbsoluteFill style={{ filter: `brightness(${mix(1, 0.42, lift)}) blur(${mix(0, 3, lift)}px)` }}>
        <CameraMotionBlur shutterAngle={160} samples={5}>
          <Camera keys={keys}>{device}</Camera>
        </CameraMotionBlur>
      </AbsoluteFill>
      <Spotlight at={T.spot} until={T.lift} rect={cardOnFrame} />
      {/* Fan cards first (behind), then the hero card. */}
      {[1, 2].map((i, k) => (
        <LiftOut key={i} at={T.cards + k * T.cardStagger} from={fanFrom(i)} to={fan[k]} tilt={[4, wide ? -14 : k ? -12 : 12]}>
          {crop(i)}
        </LiftOut>
      ))}
      <LiftOut at={T.lift} from={cardOnFrame} to={main}>
        {(w) => <Crop src="site/shop-card-1-hover.png" imgW={card.w} imgH={card.h} rect={{ x: 0, y: 0, w: card.w, h: card.h }} width={w} />}
      </LiftOut>
      <Callout at={T.callout} x={main.x + main.w / 2} y={wide ? main.y - 6 : main.y + main.h + 6} side={wide ? 'top' : 'bottom'} text="Made after you order" scale={wide ? 1 : 1.1} />
      {/* Caption on a soft scrim so it reads over the zoomed page. */}
      <AbsoluteFill
        style={{
          background: wide
            ? `linear-gradient(90deg, rgba(247,241,232,${0.94 * Math.min(1, cam.scale - 1)}) 0%, rgba(247,241,232,${0.75 * Math.min(1, cam.scale - 1)}) 26%, transparent 42%)`
            : `linear-gradient(180deg, rgba(247,241,232,${0.95 * Math.min(1, cam.scale - 1)}) 0%, rgba(247,241,232,${0.8 * Math.min(1, cam.scale - 1)}) ${story ? 30 : 26}%, transparent ${story ? 38 : 34}%)`,
        }}
      />
      <div
        style={{
          position: 'absolute', left: L.safe.side, top: wide ? 0 : L.safe.top, width: wide ? 560 : L.w - 2 * L.safe.side, height: wide ? L.h : (story ? 640 : 400) - L.safe.top - 30,
          display: 'flex', flexDirection: 'column', justifyContent: wide ? 'center' : 'flex-end', alignItems: wide ? 'flex-start' : 'center', textAlign: wide ? 'left' : 'center', gap: 22,
        }}
      >
        <Eyebrow size={L.small * 0.85} color={colors.walnut}>{copy.find.label}</Eyebrow>
        <KineticText lines={[copy.find.caption]} delay={4} size={L.caption * (wide ? 1.12 : 1)} align={wide ? 'left' : 'center'} lineHeight={1.06} />
      </div>
    </AbsoluteFill>
  );
}
