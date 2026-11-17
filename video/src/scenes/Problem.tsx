import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig } from 'remotion';
import { ArchBloom, ArchLine, ArchWindow, archBox } from '../components/Arch';
import { Vignette } from '../components/Backdrop';
import { HERO, Photo } from '../components/Photo';
import { KineticText } from '../components/Type';
import { display } from '../lib/fonts';
import { useLayout } from '../lib/layout';
import { mix, springAt } from '../lib/motion';
import { colors, copy, springs, timing } from '../video.config';
import { OPENING_PHOTO } from './Hook';

const PHOTOS = ['images/curve-walnut-shelf.webp', 'images/half-moon-planter.webp', 'images/alo-arch.jpg'];

/**
 * 3–8 s: the arch holds still while a new real piece rises into it on every other beat
 * (Handcrafted. Warm. Yours.), then the arch opens into a whole room lit by Zelqune.
 */
export function Problem() {
  const L = useLayout();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const box = archBox(L);
  const P = timing.problem;
  const open = springAt(frame, fps, P.turn, springs.camera);
  const wide = L.format === 'wide';
  // Arch → full frame: the rounded inset grows out to the frame edges.
  const inset = {
    top: mix(box.y, 0, open), left: mix(box.x, 0, open),
    right: mix(L.w - box.x - box.w, 0, open), bottom: mix(L.h - box.y - box.h, 0, open), r: mix(box.w / 2, 0, open),
  };
  const roomClip = `inset(${inset.top}px ${inset.right}px ${inset.bottom}px ${inset.left}px round ${inset.r}px ${inset.r}px 0 0)`;
  const shown = P.cuts.filter((c) => frame >= c).length - 1;
  return (
    <AbsoluteFill style={{ background: colors.night }}>
      <ArchBloom box={box} light={1 - open} />
      {/* The previous photo stays under each new one as it rises in (a match-cut inside the arch). */}
      <ArchWindow box={box} src={shown <= 0 ? OPENING_PHOTO : PHOTOS[shown - 1]} zoom={1.06} />
      {P.cuts.map((c, i) => {
        const p = springAt(frame, fps, c, springs.snappy);
        if (frame < c || i < shown - 1) return null;
        const sweep = springAt(frame, fps, c + 4, springs.camera);
        return (
          <ArchWindow key={i} box={box} src={PHOTOS[i]} zoom={mix(1.16, 1.06, p)} clip={`inset(${(1 - p) * 100}% 0 0 0 round ${box.w / 2}px ${box.w / 2}px 0 0)`}>
            <div style={{ position: 'absolute', inset: 0, mixBlendMode: 'screen', background: `linear-gradient(110deg, transparent ${mix(-30, 120, sweep) - 14}%, rgba(255,240,215,0.45) ${mix(-30, 120, sweep)}%, transparent ${mix(-30, 120, sweep) + 14}%)` }} />
          </ArchWindow>
        );
      })}
      <ArchLine box={box} draw={1} glow={0.75 * (1 - open)} />
      {/* One word per cut. */}
      {copy.problem.words.map((w, i) => {
        const c = P.cuts[i];
        const next = i < 2 ? P.cuts[i + 1] : P.turn;
        if (frame < c || frame >= next + 4) return null;
        const inP = springAt(frame, fps, c + 2, springs.snappy);
        const outP = springAt(frame, fps, next - 2, springs.snappy);
        return (
          <div key={w} style={{ position: 'absolute', left: box.text.x, top: box.text.y, width: box.text.w, height: box.text.h, display: 'flex', alignItems: wide ? 'center' : 'flex-start', justifyContent: wide ? 'flex-start' : 'center', overflow: 'hidden' }}>
            <div style={{ fontFamily: display, fontSize: L.headline * (wide ? 1.25 : 1.15), fontStyle: i === 2 ? 'italic' : 'normal', color: i === 2 ? colors.glow : colors.paper, transform: `translateY(${(1 - inP) * 110 - outP * 110}%)`, filter: `blur(${(1 - inP) * 8}px)` }}>
              {w}
            </div>
          </div>
        );
      })}
      {/* The arch opens into a whole room lit by Zelqune. */}
      <Sequence from={P.turn} layout="none">
        <AbsoluteFill style={{ clipPath: roomClip }}>
          <Photo {...HERO.moon} focus={[HERO.moon.piece[0], 0.47]} zoom={mix(1.5, wide ? 1.08 : 1.25, open)} warmth={1} />
          <Vignette strength={0.4} />
          <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'center', padding: `0 ${L.safe.side}px ${L.safe.bottom + 40}px` }}>
            <KineticText lines={[copy.problem.turn]} delay={18} size={L.caption * (wide ? 1.15 : 1.08)} color={colors.paper} align="center" style={{ fontStyle: 'italic', textShadow: '0 4px 30px rgba(0,0,0,0.55)' }} />
          </AbsoluteFill>
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
}
