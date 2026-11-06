import type { CSSProperties, ReactNode } from 'react';
import { Img, staticFile } from 'remotion';
import { colors } from '../video.config';

/** Camera on a screenshot: focus point (0–1 of the image) and zoom. */
export type Camera = { x: number; y: number; scale: number };
export const WIDE_SHOT: Camera = { x: 0.5, y: 0.5, scale: 1 };

function Screen({ src, camera = WIDE_SHOT, overlay }: { src: string; camera?: Camera; overlay?: ReactNode }) {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: colors.paper }}>
      <Img
        src={staticFile(src)}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'top',
          transformOrigin: `${camera.x * 100}% ${camera.y * 100}%`,
          transform: `scale(${camera.scale})`,
        }}
      />
      {overlay}
      {/* Glass glare. */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(115deg, rgba(255,255,255,0.10), transparent 38%)' }} />
    </div>
  );
}

type Tilt = { rx?: number; ry?: number; rz?: number };
const tiltStyle = ({ rx = 0, ry = 0, rz = 0 }: Tilt): CSSProperties => ({
  transform: `perspective(2600px) rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg)`,
  transformStyle: 'preserve-3d',
});

/** Laptop with a 16:10 screen (matches the 1440×900 captures). `width` is the lid width. */
export function Laptop({ src, width, camera, tilt = {}, overlay, style }: { src: string; width: number; camera?: Camera; tilt?: Tilt; overlay?: ReactNode; style?: CSSProperties }) {
  const pad = width * 0.022;
  const screenW = width - pad * 2;
  const screenH = screenW / 1.6;
  return (
    <div style={{ width, ...tiltStyle(tilt), ...style }}>
      <div
        style={{
          position: 'relative', width, height: screenH + pad * 2.2, borderRadius: width * 0.022,
          background: 'linear-gradient(180deg, #2A221D, #16120F)', padding: pad,
          boxShadow: `0 ${width * 0.06}px ${width * 0.09}px rgba(59,41,34,0.32), 0 ${width * 0.01}px ${width * 0.02}px rgba(59,41,34,0.25)`,
        }}
      >
        <div style={{ position: 'relative', width: screenW, height: screenH, borderRadius: width * 0.006, overflow: 'hidden' }}>
          <Screen src={src} camera={camera} overlay={overlay} />
        </div>
      </div>
      <div
        style={{
          position: 'relative', left: -width * 0.06, width: width * 1.12, height: width * 0.026,
          borderRadius: `0 0 ${width * 0.03}px ${width * 0.03}px`,
          background: 'linear-gradient(180deg, #E9DFD0 0%, #CBBDA8 60%, #A8977F 100%)',
          boxShadow: `0 ${width * 0.03}px ${width * 0.05}px rgba(59,41,34,0.3)`,
        }}
      >
        <div style={{ margin: '0 auto', width: width * 0.16, height: width * 0.008, borderRadius: '0 0 8px 8px', background: 'rgba(59,41,34,0.18)' }} />
      </div>
    </div>
  );
}

/** Phone with a 390×844 screen. `height` is the outer height. */
export function Phone({ src, height, camera, tilt = {}, overlay, style }: { src: string; height: number; camera?: Camera; tilt?: Tilt; overlay?: ReactNode; style?: CSSProperties }) {
  const pad = height * 0.016;
  const screenH = height - pad * 2;
  const screenW = screenH * (390 / 844);
  const width = screenW + pad * 2;
  return (
    <div style={{ width, height, ...tiltStyle(tilt), ...style }}>
      <div
        style={{
          position: 'relative', width, height, borderRadius: height * 0.075, padding: pad,
          background: 'linear-gradient(160deg, #3A2F28, #120E0C)',
          boxShadow: `0 ${height * 0.05}px ${height * 0.09}px rgba(59,41,34,0.36), inset 0 0 0 2px rgba(217,180,122,0.25)`,
        }}
      >
        <div style={{ position: 'relative', width: screenW, height: screenH, borderRadius: height * 0.062, overflow: 'hidden' }}>
          <Screen src={src} camera={camera} overlay={overlay} />
          <div
            style={{
              position: 'absolute', top: height * 0.012, left: '50%', transform: 'translateX(-50%)',
              width: screenW * 0.3, height: height * 0.032, borderRadius: 999, background: '#0B0908',
            }}
          />
        </div>
      </div>
    </div>
  );
}

/** Phone geometry helper (outer width for a given height). */
export const phoneWidth = (height: number) => (height - height * 0.032) * (390 / 844) + height * 0.032;
