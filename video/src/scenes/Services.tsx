import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Vignette } from '../components/Backdrop';
import { KineticText } from '../components/Type';
import { display, ui } from '../lib/fonts';
import { useLayout } from '../lib/layout';
import { mix, springAt, useSpringAt } from '../lib/motion';
import { colors, copy, screens, springs } from '../video.config';

/** Title card that opens the services chapter: "Need a whole space?" and the three services. */
export function Services() {
  const L = useLayout();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const push = useSpringAt(0, springs.camera);
  const wide = L.format === 'wide';
  return (
    <AbsoluteFill style={{ background: colors.night }}>
      <AbsoluteFill style={{ filter: 'blur(22px) brightness(0.4) saturate(1.1)', transform: `scale(${mix(1.25, 1.12, push)})` }}>
        <Img src={staticFile(screens.constructionDesktop)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </AbsoluteFill>
      <Vignette strength={0.6} />
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', gap: wide ? 60 : 80, padding: `${L.safe.top}px ${L.safe.side}px ${L.safe.bottom}px` }}>
        <KineticText lines={copy.services.title} accentLine={1} size={L.headline * (wide ? 1.05 : 1)} color={colors.paper} align="center" delay={2} stagger={4} />
        <div style={{ display: 'flex', flexDirection: wide ? 'row' : 'column', gap: wide ? 70 : 34, alignItems: 'center' }}>
          {copy.services.items.map((it, i) => {
            const p = springAt(frame, fps, 16 + i * 5, springs.snappy);
            return (
              <div key={it.id} style={{ display: 'flex', alignItems: 'baseline', gap: 18, opacity: p, transform: `translateY(${(1 - p) * 30}px)` }}>
                <span style={{ fontFamily: ui, fontSize: L.small * 0.9, letterSpacing: '0.2em', color: colors.brass }}>{it.index}</span>
                <span style={{ fontFamily: display, fontSize: L.caption * 0.8, color: colors.cream }}>{it.name}</span>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
