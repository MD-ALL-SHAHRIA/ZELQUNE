import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { Backdrop, Vignette } from '../components/Backdrop';
import { KineticText } from '../components/Type';
import { useLayout } from '../lib/layout';
import { mix, springAt } from '../lib/motion';
import { beats, colors, copy, springs } from '../video.config';

/** 3–8 s: the cold "before" world. Three pains stack up; identical blank frames multiply on the wall. */
export function Problem() {
  const L = useLayout();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const lineAt = [2, beats(3), beats(6)];
  const wide = L.format === 'wide';
  const cols = wide ? 6 : 3;
  const rows = wide ? 2 : L.format === 'story' ? 4 : 3;
  const frameW = wide ? 190 : 210;
  const gap = wide ? 46 : 52;
  const gridW = cols * frameW + (cols - 1) * gap;
  const size = L.headline * (wide ? 0.82 : 0.64);
  return (
    <AbsoluteFill>
      <Backdrop tone="cold" drift={0.4} />
      {/* The same mass-made frame, again and again. */}
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', opacity: 0.32 }}>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, ${frameW}px)`, gap, width: gridW }}>
          {Array.from({ length: cols * rows }).map((_, i) => {
            const p = springAt(frame, fps, beats(5.5) + (i % 7) * 2, springs.pop);
            return (
              <div
                key={i}
                style={{
                  height: frameW * 1.25, border: '6px solid #5E6B76', background: 'linear-gradient(160deg, #2A333C, #222A31)',
                  transform: `scale(${mix(0.6, 1, p)})`, opacity: p,
                }}
              />
            );
          })}
        </div>
      </AbsoluteFill>
      <Vignette strength={0.7} />
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: wide ? 'flex-start' : 'center', padding: `0 ${L.safe.side}px` }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: wide ? 18 : 26, alignItems: wide ? 'flex-start' : 'center' }}>
          {copy.problem.lines.map((line, i) => {
            const dim = springAt(frame, fps, lineAt[i] + beats(3), springs.soft);
            return (
              <div key={line} style={{ opacity: i < 2 ? mix(1, 0.4, dim) : 1 }}>
                <KineticText lines={[line]} delay={lineAt[i]} size={size} color={colors.cold} align={wide ? 'left' : 'center'} stagger={3} />
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
