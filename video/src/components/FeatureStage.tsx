import type { ReactNode } from 'react';
import { AbsoluteFill } from 'remotion';
import { useLayout, type Format } from '../lib/layout';
import { mix, useSpringAt } from '../lib/motion';
import { colors, springs } from '../video.config';
import { Backdrop } from './Backdrop';
import { Laptop, Phone, phoneWidth, type Camera } from './Devices';
import { Eyebrow, KineticText } from './Type';

export type Box = { x: number; y: number; w: number; h: number };
export type Stage = { format: Format; device: Box; screen: Box };

/** Where a normalized point of the screenshot lands on screen, given the camera. */
export function project(p: [number, number], cam: Camera, screen: { w: number; h: number }): [number, number] {
  return [(cam.x + (p[0] - cam.x) * cam.scale) * screen.w, (cam.y + (p[1] - cam.y) * cam.scale) * screen.h];
}

type Props = {
  eyebrow: string;
  caption: string;
  desktop: string;
  mobile: string;
  /** Camera move on the desktop shot (wide) and on the mobile shot (feed, story). */
  cam: { desktop: [Camera, Camera]; mobile: [Camera, Camera] };
  camAt?: number;
  screenOverlay?: (stage: Stage, cam: Camera) => ReactNode;
  extras?: (stage: Stage) => ReactNode;
  /** Optional filter on the screen image layer (used by the day/night beat). */
  tone?: 'paper' | 'warm' | 'dark';
};

export function FeatureStage({ eyebrow, caption, desktop, mobile, cam, camAt = 18, screenOverlay, extras, tone = 'paper' }: Props) {
  const L = useLayout();
  const enter = useSpringAt(0, springs.soft);
  const camP = useSpringAt(camAt, springs.camera);
  const wide = L.format === 'wide';
  const [c0, c1] = wide ? cam.desktop : cam.mobile;
  const camera: Camera = { x: mix(c0.x, c1.x, camP), y: mix(c0.y, c1.y, camP), scale: mix(c0.scale, c1.scale, camP) };

  let stage: Stage;
  let captionBox: Box;
  if (wide) {
    const w = 1080;
    const pad = w * 0.022;
    const sw = w - pad * 2;
    const sh = sw / 1.6;
    const total = sh + pad * 2.2 + w * 0.026;
    const x = L.w - L.safe.side - w + 40;
    const y = (L.h - total) / 2;
    stage = { format: L.format, device: { x, y, w, h: total }, screen: { x: x + pad, y: y + pad, w: sw, h: sh } };
    captionBox = { x: L.safe.side, y: 0, w: x - L.safe.side - 70, h: L.h };
  } else {
    const story = L.format === 'story';
    const top = story ? 640 : 400;
    const h = story ? 1150 : 900;
    const w = phoneWidth(h);
    const pad = h * 0.016;
    const x = (L.w - w) / 2;
    stage = { format: L.format, device: { x, y: top, w, h }, screen: { x: x + pad, y: top + pad, w: w - pad * 2, h: h - pad * 2 } };
    captionBox = { x: L.safe.side, y: L.safe.top, w: L.w - L.safe.side * 2, h: top - L.safe.top - 30 };
  }

  const rise = (1 - enter) * 140;
  const tilt = wide
    ? { rx: mix(14, 6, enter), ry: mix(-26, -12, enter) + camP * 3, rz: mix(2, 0, enter) }
    : { rx: mix(16, 4, enter), ry: mix(22, 6, enter) - camP * 3 };

  return (
    <AbsoluteFill>
      <Backdrop tone={tone} />
      <div
        style={{
          position: 'absolute', left: captionBox.x, top: captionBox.y, width: captionBox.w, height: captionBox.h,
          display: 'flex', flexDirection: 'column', justifyContent: wide ? 'center' : 'flex-end', alignItems: wide ? 'flex-start' : 'center',
          textAlign: wide ? 'left' : 'center', gap: 22,
        }}
      >
        <Eyebrow size={L.small * 0.85} color={tone === 'dark' ? colors.brass : colors.walnut}>{eyebrow}</Eyebrow>
        <KineticText
          lines={[caption]}
          delay={4}
          size={L.caption * (wide ? 1.12 : 1)}
          color={tone === 'dark' ? colors.paper : colors.espresso}
          align={wide ? 'left' : 'center'}
          lineHeight={1.06}
        />
      </div>
      <div style={{ position: 'absolute', left: stage.device.x, top: stage.device.y + rise }}>
        {wide ? (
          <Laptop src={desktop} width={stage.device.w} camera={camera} tilt={tilt} overlay={screenOverlay?.(stage, camera)} />
        ) : (
          <Phone src={mobile} height={stage.device.h} camera={camera} tilt={tilt} overlay={screenOverlay?.(stage, camera)} />
        )}
      </div>
      {extras?.(stage)}
    </AbsoluteFill>
  );
}
