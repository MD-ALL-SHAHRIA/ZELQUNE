import { CameraMotionBlur } from '@remotion/motion-blur';
import type { ReactNode } from 'react';
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { useLayout, type Format } from '../lib/layout';
import { mix, springAt } from '../lib/motion';
import type { El, PageShot } from '../lib/site';
import { colors, springs } from '../video.config';
import { Backdrop } from './Backdrop';
import { Camera, PageScreen, cameraAt, project, type CamKey, type CamState } from './Camera';
import { Laptop, Phone, phoneWidth } from './Devices';
import { Callout, Crop, LiftOut, Spotlight, type Rect } from './Glass';
import { Eyebrow, KineticText } from './Type';
import { Cursor, Tap } from './Ui';

type Shot = PageShot & { src: string };
export type ScrollKey = { at: number; to: number; dur?: number };
/** A page shown on the device from frame `from` (it wipes up over the previous one). */
export type ShotRef = { shot: Shot; from: number; scroll?: ScrollKey[]; enter?: 'wipe' | 'drawer' | 'fade' };

export type Geo = {
  format: Format; wide: boolean; story: boolean; W: number; H: number;
  screen: { x: number; y: number; w: number; h: number };
  anchor: { ax: number; ay: number };
};

/** Camera push onto element `el` of shot `shot`, `zoom`x, starting at `at`. */
export type Focus = { at: number; dur?: number; shot: number; el: El; zoom: number; ax?: number; ay?: number };
export type Lift = { at: number; shot: number; el: El; to: Rect; tilt?: [number, number]; content?: (w: number) => ReactNode };
export type CursorStop = { at: number; el: El; click?: number };

export type Plan = {
  /** Opening wide shot tilt (degrees). */
  open?: { rx: number; ry: number };
  focus: Focus[];
  /** Cursor (taps on phones), drawn on every listed shot so it carries across page changes. */
  cursor?: { shots: number[]; from: [number, number]; stops: CursorStop[] };
  spot?: { shot: number; el: El; at: number; until: number };
  lifts?: Lift[];
  callout?: { at: number; text: string; x: number; y: number; side?: 'top' | 'bottom' | 'left' | 'right' };
  /** Frame from which the page dims and blurs behind lifted glass. */
  dim?: number;
  /** Extra layers drawn on a shot, in page CSS px (hover states, typing, night mode...). */
  pageOverlay?: (shot: number) => ReactNode;
  /** Extra layers in frame px, above everything (toasts, counters). */
  extras?: ReactNode;
};

function scrollAt(ref: ShotRef, frame: number, fps: number): number {
  let s = 0;
  for (const k of ref.scroll ?? []) {
    s = mix(s, k.to, spring({ frame: frame - k.at, fps, config: { damping: 200 }, durationInFrames: k.dur ?? 40 }));
  }
  return s;
}

/** Frame rect of a page element, through the camera at this frame. */
function frameRect(cam: CamState, g: Geo, shot: Shot, e: El, scroll: number): Rect {
  const k = g.screen.w / shot.width;
  const sx = g.screen.x + e.x * k;
  const sy = g.screen.y + (e.y - scroll) * k;
  const [x, y] = project(cam, sx, sy);
  return { x, y, w: e.w * k * cam.scale, h: e.h * k * cam.scale };
}

/**
 * A website section beat: the real page on a device, filmed by the camera. Wide and tilted, then the
 * camera scrolls and pushes onto real elements; the cursor interacts; key pieces lift out on glass.
 */
export function SiteBeat({ eyebrow, caption, shots, plan, tone = 'paper' }: { eyebrow: string; caption: string; shots: ShotRef[]; plan: (g: Geo) => Plan; tone?: 'paper' | 'warm' | 'dark' }) {
  const L = useLayout();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const wide = L.format === 'wide';
  const story = L.format === 'story';

  // Device geometry (stage px at camera scale 1).
  let screen: Geo['screen'];
  let place: { x: number; y: number; w: number; h: number };
  if (wide) {
    const w = 1180;
    const pad = w * 0.022;
    const sw = w - pad * 2;
    const x = L.w - L.safe.side - w + 60;
    const y = (L.h - (sw / 1.6 + pad * 2.2 + w * 0.026)) / 2;
    screen = { x: x + pad, y: y + pad, w: sw, h: sw / 1.6 };
    place = { x, y, w, h: 0 };
  } else {
    const h = story ? 1150 : 900;
    const top = story ? 640 : 400;
    const w = phoneWidth(h);
    const pad = h * 0.016;
    const x = (L.w - w) / 2;
    screen = { x: x + pad, y: top + pad, w: w - 2 * pad, h: h - 2 * pad };
    place = { x, y: top, w, h };
  }
  const anchor = wide ? { ax: L.w * 0.6, ay: L.h * 0.53 } : { ax: L.w / 2, ay: story ? 1130 : 800 };
  const g: Geo = { format: L.format, wide, story, W: L.w, H: L.h, screen, anchor };
  const p = plan(g);

  // Camera: wide & tilted, then one key per focus (scroll settled at the end of each push).
  const open = p.open ?? { rx: 8, ry: wide ? -14 : 12 };
  const keys: CamKey[] = [{ at: 0, x: L.w / 2, y: L.h / 2, scale: 1, rx: open.rx, ry: open.ry }];
  for (const f of p.focus) {
    const ref = shots[f.shot];
    const sc = scrollAt(ref, f.at + (f.dur ?? 34) + 60, fps);
    const k = screen.w / ref.shot.width;
    keys.push({
      at: f.at, dur: f.dur ?? 34, scale: f.zoom, ax: f.ax ?? anchor.ax, ay: f.ay ?? anchor.ay,
      x: screen.x + (f.el.x + f.el.w / 2) * k, y: screen.y + (f.el.y + f.el.h / 2 - sc) * k,
    });
  }
  const cam = cameraAt(frame, fps, keys, L.w, L.h);
  const rectOf = (shot: number, e: El) => frameRect(cam, g, shots[shot].shot, e, scrollAt(shots[shot], frame, fps));

  // Screen content: the active shots, each wiping up over the previous.
  const content = (sw: number) => (
    <AbsoluteFill>
      {shots.map((ref, i) => {
        if (frame < ref.from - 1) return null;
        const wipe = i === 0 ? 1 : springAt(frame, fps, ref.from, springs.snappy);
        const next = shots[i + 1];
        if (next && springAt(frame, fps, next.from, springs.snappy) > 0.999) return null;
        const c = p.cursor && p.cursor.shots.includes(i) ? p.cursor : undefined;
        const enter = ref.enter ?? 'wipe';
        const clip = wipe >= 0.999 ? undefined : enter === 'drawer' ? `inset(0 ${(1 - wipe) * 100}% 0 0)` : enter === 'wipe' ? `inset(${(1 - wipe) * 100}% 0 0 0)` : undefined;
        return (
          <AbsoluteFill key={i} style={{ clipPath: clip, opacity: enter === 'fade' ? wipe : 1 }}>
            <PageScreen src={ref.shot.src} pageWidth={ref.shot.width} screenWidth={sw} scroll={scrollAt(ref, frame, fps)}>
              {p.pageOverlay?.(i)}
              {c && wide && (
                <Cursor
                  size={26}
                  stops={[
                    { at: c.stops[0].at - 12, x: c.from[0], y: c.from[1] },
                    ...c.stops.map((s) => ({ at: s.at, x: s.el.x + s.el.w / 2, y: s.el.y + s.el.h / 2, click: s.click })),
                  ]}
                />
              )}
              {c && !wide && c.stops.filter((s) => s.click !== undefined).map((s, j) => <Tap key={j} x={s.el.x + s.el.w / 2} y={s.el.y + s.el.h / 2} at={s.click!} size={34} />)}
            </PageScreen>
          </AbsoluteFill>
        );
      })}
    </AbsoluteFill>
  );
  const device = wide ? (
    <div style={{ position: 'absolute', left: place.x, top: place.y }}><Laptop src="" width={place.w} content={content(screen.w)} /></div>
  ) : (
    <div style={{ position: 'absolute', left: place.x, top: place.y }}><Phone src="" height={place.h} content={content(screen.w)} /></div>
  );

  const dim = p.dim === undefined ? 0 : springAt(frame, fps, p.dim, springs.soft);
  const z = Math.min(1, Math.max(0, (cam.scale - 1) * 4));
  return (
    <AbsoluteFill>
      <Backdrop tone={tone} />
      <AbsoluteFill style={{ filter: dim > 0.001 ? `brightness(${mix(1, 0.42, dim)}) blur(${mix(0, 3, dim)}px)` : undefined }}>
        <CameraMotionBlur shutterAngle={160} samples={5}>
          <Camera keys={keys}>{device}</Camera>
        </CameraMotionBlur>
      </AbsoluteFill>
      {p.spot && <Spotlight at={p.spot.at} until={p.spot.until} rect={rectOf(p.spot.shot, p.spot.el)} />}
      {(p.lifts ?? []).map((l, i) => (
        <LiftOut key={i} at={l.at} from={rectOf(l.shot, l.el)} to={l.to} tilt={l.tilt}>
          {l.content ?? ((w) => <Crop src={shots[l.shot].shot.src} imgW={shots[l.shot].shot.width} imgH={shots[l.shot].shot.height} rect={l.el} width={w} />)}
        </LiftOut>
      ))}
      {p.callout && <Callout at={p.callout.at} x={p.callout.x} y={p.callout.y} side={p.callout.side} text={p.callout.text} scale={wide ? 1 : 1.1} />}
      {p.extras}
      {/* Caption over a soft scrim so it reads on top of the zoomed page. */}
      <AbsoluteFill
        style={{
          background: wide
            ? `linear-gradient(90deg, rgba(247,241,232,${0.94 * z}) 0%, rgba(247,241,232,${0.75 * z}) 26%, transparent 42%)`
            : `linear-gradient(180deg, rgba(247,241,232,${0.97 * z}) 0%, rgba(247,241,232,${0.97 * z}) ${story ? 34 : 29}%, transparent ${story ? 44 : 38}%)`,
        }}
      />
      <div
        style={{
          position: 'absolute', left: L.safe.side, top: wide ? 0 : L.safe.top, width: wide ? 560 : L.w - 2 * L.safe.side, height: wide ? L.h : (story ? 640 : 400) - L.safe.top - 30,
          display: 'flex', flexDirection: 'column', justifyContent: wide ? 'center' : 'flex-end', alignItems: wide ? 'flex-start' : 'center', textAlign: wide ? 'left' : 'center', gap: 22,
        }}
      >
        <Eyebrow size={L.small * 0.85} color={colors.walnut}>{eyebrow}</Eyebrow>
        <KineticText lines={[caption]} delay={4} size={L.caption * (wide ? 1.12 : 1)} align={wide ? 'left' : 'center'} lineHeight={1.06} />
      </div>
    </AbsoluteFill>
  );
}

/** Hero/fan target rects in frame px for lift-outs, keeping glass inside the safe area. */
export function liftSlots(g: Geo, ratio: number, count: number): Rect[] {
  // As large as fits both a max width and a max height (tall cards and wide strips both read well).
  const [maxW, maxH] = g.wide ? [1000, 780] : g.story ? [920, 760] : [880, 600];
  const mainW = Math.min(maxW, maxH / ratio);
  const main: Rect = { x: g.anchor.ax - mainW / 2, y: g.anchor.ay - (mainW * ratio) / 2, w: mainW, h: mainW * ratio };
  const fanW = mainW * 0.78;
  const fans: Rect[] = g.wide
    ? [{ x: main.x + mainW * 0.62, y: main.y + 50, w: fanW, h: fanW * ratio }, { x: main.x + mainW * 1.05, y: main.y + 100, w: fanW * 0.9, h: fanW * 0.9 * ratio }]
    : [{ x: main.x - fanW * 0.55, y: main.y + 60, w: fanW, h: fanW * ratio }, { x: main.x + mainW - fanW * 0.45, y: main.y + 60, w: fanW, h: fanW * ratio }];
  return [main, ...fans].slice(0, count);
}
