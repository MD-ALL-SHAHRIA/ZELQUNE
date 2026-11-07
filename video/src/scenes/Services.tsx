import { AbsoluteFill, Img, Sequence, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Backdrop, Vignette } from '../components/Backdrop';
import { GlassCard } from '../components/Glass';
import { KineticText } from '../components/Type';
import { display, ui } from '../lib/fonts';
import { useLayout } from '../lib/layout';
import { mix, springAt, useSpringAt } from '../lib/motion';
import { page, type PageName } from '../lib/site';
import { colors, copy, springs, timing } from '../video.config';

const T = timing.services;
const FLIPS: { name: PageName; label: string }[] = [
  { name: 'design-top', label: 'Interior design' },
  { name: 'construction-top', label: 'Construction' },
  { name: 'bulk-top', label: 'Bulk & corporate' },
  { name: 'story-top', label: 'Our story' },
];

/** Services chapter: "Need a whole space?", then a fast page-flip montage of the real pages. */
export function Services() {
  const L = useLayout();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const push = useSpringAt(0, springs.camera);
  const wide = L.format === 'wide';
  const out = springAt(frame, fps, T.montage - 6, springs.soft);
  return (
    <AbsoluteFill style={{ background: colors.night }}>
      <AbsoluteFill style={{ filter: 'blur(22px) brightness(0.4) saturate(1.1)', transform: `scale(${mix(1.25, 1.12, push)})` }}>
        <Img src={staticFile(page('construction-top', 'desktop').src)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </AbsoluteFill>
      <Vignette strength={0.6} />
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', gap: wide ? 60 : 80, padding: `${L.safe.top}px ${L.safe.side}px ${L.safe.bottom}px`, opacity: 1 - out, transform: `scale(${mix(1, 0.92, out)})` }}>
        <KineticText lines={copy.services.title} accentLine={1} size={L.headline * (wide ? 1.05 : 1)} color={colors.paper} align="center" delay={2} stagger={4} />
        <div style={{ display: 'flex', flexDirection: wide ? 'row' : 'column', gap: wide ? 70 : 34, alignItems: 'center' }}>
          {copy.services.items.map((it, i) => {
            const p = springAt(frame, fps, T.items + i * T.itemStagger, springs.snappy);
            return (
              <div key={it.id} style={{ display: 'flex', alignItems: 'baseline', gap: 18, opacity: p, transform: `translateY(${(1 - p) * 30}px)` }}>
                <span style={{ fontFamily: ui, fontSize: L.small * 0.9, letterSpacing: '0.2em', color: colors.brass }}>{it.index}</span>
                <span style={{ fontFamily: display, fontSize: L.caption * 0.8, color: colors.cream }}>{it.name}</span>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
      {FLIPS.map((f, i) => (
        <Sequence key={f.name} from={T.flips[i]} durationInFrames={i === FLIPS.length - 1 ? 60 : T.flipEvery + 8} layout="none">
          <Flip name={f.name} label={f.label} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
}

/** One page of the montage: flips in on Y like a turning page, in a glass browser frame. */
function Flip({ name, label }: { name: PageName; label: string }) {
  const L = useLayout();
  const wide = L.format === 'wide';
  const flip = useSpringAt(0, springs.snappy);
  const pg = page(name, wide ? 'desktop' : 'mobile');
  const w = wide ? 1500 : L.format === 'story' ? 760 : 560;
  const h = (w * pg.height) / pg.width;
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', perspective: 2200 }}>
      <Backdrop tone="dark" />
      <div style={{ transform: `rotateY(${mix(70, 0, flip)}deg) translateZ(${mix(-300, 0, flip)}px)`, transformOrigin: 'left center', opacity: Math.min(1, flip * 3) }}>
        <GlassCard pad={14} radius={24} sweep={flip}>
          <div style={{ width: w, height: Math.min(h, L.h * 0.62), overflow: 'hidden', borderRadius: 14 }}>
            <Img src={staticFile(pg.src)} style={{ width: w, display: 'block' }} />
          </div>
        </GlassCard>
      </div>
      <div style={{ position: 'absolute', bottom: L.safe.bottom + (wide ? 20 : 40), fontFamily: ui, fontSize: L.small, letterSpacing: '0.2em', textTransform: 'uppercase', color: colors.brass, opacity: flip }}>
        {label}
      </div>
    </AbsoluteFill>
  );
}
