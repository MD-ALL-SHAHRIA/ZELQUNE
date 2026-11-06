import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { LightShaft, Vignette } from '../components/Backdrop';
import { HERO, Photo } from '../components/Photo';
import { display } from '../lib/fonts';
import { useLayout } from '../lib/layout';
import { mix, springAt, useSpringAt } from '../lib/motion';
import { colors, copy, springs } from '../video.config';

/**
 * 0–3 s: a real room with a bare wall, graded cold. The pain lands in the first second as
 * oversized serif words that resolve out of blur; a light band sweeps across them.
 */
export function Hook() {
  const L = useLayout();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const push = useSpringAt(0, springs.camera);
  const sweep = useSpringAt(26, springs.camera);
  const rule = useSpringAt(30, springs.soft);
  const wide = L.format === 'wide';
  const size = wide ? 190 : L.format === 'story' ? 168 : 156;
  const words = copy.hook.flatMap((line, li) => line.split(' ').map((w) => ({ w, li })));
  return (
    <AbsoluteFill style={{ background: colors.night }}>
      <Photo {...HERO.moon} focus={[0.18, 0.5]} zoom={mix(1.75, 1.6, push)} warmth={0} />
      <LightShaft offset={0} />
      <Vignette strength={0.75} />
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', padding: L.safe.side }}>
        <div style={{ position: 'relative', fontFamily: display, fontSize: size, lineHeight: 0.95, color: '#E8EDF2', textAlign: 'center', fontWeight: 500 }}>
          {copy.hook.map((line, li) => (
            <div key={li} style={{ whiteSpace: 'nowrap' }}>
              {line.split(' ').map((w, wi) => {
                const i = words.findIndex((x) => x.w === w && x.li === li);
                const p = springAt(frame, fps, 1 + i * 4, springs.snappy);
                const italic = li === copy.hook.length - 1 && wi === line.split(' ').length - 1;
                return (
                  <span
                    key={wi}
                    style={{
                      display: 'inline-block', margin: `0 ${size * 0.12}px`, opacity: Math.min(1, p * 1.4),
                      filter: `blur(${(1 - p) * 18}px)`, transform: `translateY(${(1 - p) * 40}px) scale(${mix(1.25, 1, p)})`,
                      fontStyle: italic ? 'italic' : 'normal',
                    }}
                  >
                    {w}
                  </span>
                );
              })}
            </div>
          ))}
          {/* Light band sweeping across the words. */}
          <div
            style={{
              position: 'absolute', inset: '-10% -20%', mixBlendMode: 'overlay', pointerEvents: 'none',
              background: `linear-gradient(100deg, transparent ${mix(-30, 110, sweep) - 12}%, rgba(255,255,255,0.9) ${mix(-30, 110, sweep)}%, transparent ${mix(-30, 110, sweep) + 12}%)`,
            }}
          />
          <div style={{ margin: `${size * 0.22}px auto 0`, width: size * 2.4, height: 2, background: colors.cold, opacity: 0.6, transform: `scaleX(${rule})` }} />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
