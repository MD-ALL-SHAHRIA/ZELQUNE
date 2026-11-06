import type { ReactNode } from 'react';
import { AbsoluteFill, Img, staticFile } from 'remotion';
import targetsJson from '../../assets/screens/targets.json';
import { useLayout, type Format } from '../lib/layout';
import { mix, useSpringAt } from '../lib/motion';
import { colors, springs } from '../video.config';
import { Backdrop } from './Backdrop';
import { Laptop, Phone, phoneWidth } from './Devices';
import { Eyebrow, KineticText } from './Type';

export type Box = { x: number; y: number; w: number; h: number };
export type Stage = { format: Format; device: Box; screen: Box };

type Target = { x: number; y: number; w: number; h: number; left: number } | null;
type TargetName = 'themeToggle' | 'preorder' | 'firstCard' | 'orderInput' | 'trackButton';

/** Where a real control sits on the device screen (px), from targets.json written by capture.mjs. */
export function target(stage: Stage, name: TargetName): { x: number; y: number; w: number; h: number; left: number } | null {
  const t = (targetsJson as Record<string, Record<string, Target>>)[stage.format === 'wide' ? 'desktop' : 'mobile']?.[name];
  if (!t) return null;
  return { x: t.x * stage.screen.w, y: t.y * stage.screen.h, w: t.w * stage.screen.w, h: t.h * stage.screen.h, left: t.left * stage.screen.w };
}

/** A second screenshot laid exactly over the screen, revealed by a clip-path (day→night, typing). */
export function ScreenSwap({ src, clip }: { src: string; clip: string }) {
  return (
    <AbsoluteFill style={{ clipPath: clip }}>
      <Img src={staticFile(src)} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
    </AbsoluteFill>
  );
}

type Props = {
  eyebrow: string;
  caption: string;
  desktop: string;
  mobile: string;
  screenOverlay?: (stage: Stage) => ReactNode;
  extras?: (stage: Stage) => ReactNode;
  tone?: 'paper' | 'warm' | 'dark';
};

/**
 * One feature beat: benefit caption + the real page on a device. The screenshot is never zoomed
 * (no text cut off); the camera moves the whole device instead (dolly + tilt).
 */
export function FeatureStage({ eyebrow, caption, desktop, mobile, screenOverlay, extras, tone = 'paper' }: Props) {
  const L = useLayout();
  const enter = useSpringAt(0, springs.soft);
  const dolly = useSpringAt(6, springs.camera);
  const wide = L.format === 'wide';

  let stage: Stage;
  let captionBox: Box;
  if (wide) {
    const w = 1120;
    const pad = w * 0.022;
    const sw = w - pad * 2;
    const sh = sw / 1.6;
    const total = sh + pad * 2.2 + w * 0.026;
    const x = L.w - L.safe.side - w + 60;
    const y = (L.h - total) / 2 + 10;
    stage = { format: L.format, device: { x, y, w, h: total }, screen: { x: x + pad, y: y + pad, w: sw, h: sh } };
    captionBox = { x: L.safe.side, y: 0, w: x - L.safe.side - 60, h: L.h };
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

  const rise = (1 - enter) * 160;
  const tilt = wide
    ? { rx: mix(16, 4, enter), ry: mix(-24, -7, enter) + dolly * 2, rz: mix(2, 0, enter) }
    : { rx: mix(18, 3, enter), ry: mix(24, 5, enter) - dolly * 3 };
  // Camera push on the whole stage around the device centre.
  const cx = stage.device.x + stage.device.w / 2;
  const cy = stage.device.y + stage.device.h / 2;
  const zoom = mix(0.96, 1.03, dolly);

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
        <KineticText lines={[caption]} delay={4} size={L.caption * (wide ? 1.12 : 1)} color={tone === 'dark' ? colors.paper : colors.espresso} align={wide ? 'left' : 'center'} lineHeight={1.06} />
      </div>
      <AbsoluteFill style={{ transformOrigin: `${cx}px ${cy}px`, transform: `scale(${zoom})` }}>
        {/* Soft contact shadow under the device. */}
        <div
          style={{
            position: 'absolute', left: stage.device.x + stage.device.w * 0.08, width: stage.device.w * 0.84, top: stage.device.y + stage.device.h - 30,
            height: 60, borderRadius: '50%', background: 'rgba(59,41,34,0.35)', filter: 'blur(28px)', opacity: enter,
          }}
        />
        <div style={{ position: 'absolute', left: stage.device.x, top: stage.device.y + rise }}>
          {wide ? (
            <Laptop src={desktop} width={stage.device.w} tilt={tilt} overlay={screenOverlay?.(stage)} />
          ) : (
            <Phone src={mobile} height={stage.device.h} tilt={tilt} overlay={screenOverlay?.(stage)} />
          )}
        </div>
        {extras?.(stage)}
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
