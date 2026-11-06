import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig } from 'remotion';
import { LightShaft, Vignette } from '../components/Backdrop';
import { HERO, Photo } from '../components/Photo';
import { KineticText } from '../components/Type';
import { display } from '../lib/fonts';
import { useLayout } from '../lib/layout';
import { mix, springAt, useSpringAt } from '../lib/motion';
import { BEAT, colors, copy, springs, timing } from '../video.config';

const SHOT = BEAT * 2; // one word per two beats
const shots = [
  { hero: HERO.curve, focus: [0.2, 0.45] as [number, number] },
  { hero: HERO.half, focus: [0.24, 0.55] as [number, number] },
  { hero: HERO.moon, focus: [0.18, 0.5] as [number, number] },
];

/** One cold shot: a bare wall and one huge word. Enters through vertical blinds. */
function ColdShot({ i }: { i: number }) {
  const L = useLayout();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const drift = useSpringAt(0, springs.camera);
  const slats = 6;
  const p = (k: number) => springAt(frame, fps, k * 1.2, springs.snappy);
  const clip = i === 0 ? undefined : `polygon(${Array.from({ length: slats })
    .map((_, k) => {
      const x0 = (k / slats) * 100;
      const x1 = x0 + (100 / slats) * p(k);
      return `${x0}% 0%, ${x1}% 0%, ${x1}% 100%, ${x0}% 100%, ${x0}% 0%`;
    })
    .join(', ')})`;
  const word = copy.problem.words[i];
  const size = L.format === 'wide' ? 230 : word.length > 8 ? 168 : 230;
  const w = springAt(frame, fps, 2, springs.snappy);
  return (
    <AbsoluteFill style={{ clipPath: clip }}>
      <Photo {...shots[i].hero} focus={shots[i].focus} zoom={mix(1.75, 1.6, drift)} warmth={0} />
      <LightShaft offset={i * 40} />
      <Vignette strength={0.7} />
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div
          style={{
            fontFamily: display, fontSize: size, color: '#E8EDF2', fontStyle: i === 2 ? 'italic' : 'normal',
            letterSpacing: `${mix(0.12, -0.01, w)}em`, opacity: w, filter: `blur(${(1 - w) * 14}px)`,
          }}
        >
          {word}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

/**
 * 3–8 s: three cold cuts on the beat (bare, cold, forgettable), then the camera swings across
 * the wall to a real Zelqune piece as its light comes on.
 */
export function Problem() {
  const L = useLayout();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const turnAt = timing.problem.turn;
  const pan = springAt(frame, fps, turnAt, springs.camera);
  const warm = springAt(frame, fps, turnAt + 16, springs.soft);
  const bloom = springAt(frame, fps, timing.problem.bloom, springs.pop);
  const story = L.format === 'story';
  return (
    <AbsoluteFill style={{ background: colors.night }}>
      <Sequence from={turnAt} layout="none">
        <AbsoluteFill>
          <Photo {...HERO.moon} focus={[mix(0.18, HERO.moon.piece[0], pan), 0.5]} zoom={mix(1.6, 1.05, warm)} warmth={warm} />
          <AbsoluteFill
            style={{
              background: `radial-gradient(${mix(5, 38, bloom)}% ${mix(5, 30, bloom)}% at 50% 42%, rgba(242,197,138,${0.55 * bloom}), transparent 70%)`,
              mixBlendMode: 'screen',
            }}
          />
          <Vignette strength={mix(0.7, 0.35, warm)} />
          <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'center', padding: `0 ${L.safe.side}px ${story ? L.safe.bottom + 40 : L.safe.bottom + 40}px` }}>
            <KineticText lines={[copy.problem.turn]} delay={20} size={L.caption * 1.05} color={colors.paper} align="center" style={{ fontStyle: 'italic', textShadow: '0 4px 30px rgba(0,0,0,0.5)' }} />
          </AbsoluteFill>
        </AbsoluteFill>
      </Sequence>
      {[0, 1, 2].map((i) => (
        <Sequence key={i} from={i * SHOT} durationInFrames={i === 2 ? SHOT : SHOT + 12} layout="none">
          <ColdShot i={i} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
}
