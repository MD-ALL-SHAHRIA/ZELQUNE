import type { ReactNode } from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig } from 'remotion';
import { Soundtrack } from './audio/Sfx';
import { Grain } from './components/Backdrop';
import './lib/fonts';
import { mix, springAt } from './lib/motion';
import { Cta } from './scenes/Cta';
import { Deliver } from './scenes/Deliver';
import { Find } from './scenes/Find';
import { Hook } from './scenes/Hook';
import { Moods } from './scenes/Moods';
import { Problem } from './scenes/Problem';
import { Proof } from './scenes/Proof';
import { Reserve } from './scenes/Reserve';
import { Reveal } from './scenes/Reveal';
import { Bulk } from './scenes/Bulk';
import { Construction } from './scenes/Construction';
import { Design } from './scenes/Design';
import { Services } from './scenes/Services';
import { TRANSITION, beats, scenes, springs, type SceneId } from './video.config';

type Wipe = 'none' | 'rise' | 'circle' | 'arch' | 'diagonal';

const timeline: { id: SceneId; el: ReactNode; wipe: Wipe }[] = [
  { id: 'hook', el: <Hook />, wipe: 'none' },
  { id: 'problem', el: <Problem />, wipe: 'rise' },
  { id: 'reveal', el: <Reveal />, wipe: 'circle' },
  { id: 'find', el: <Find />, wipe: 'arch' },
  { id: 'moods', el: <Moods />, wipe: 'diagonal' },
  { id: 'reserve', el: <Reserve />, wipe: 'arch' },
  { id: 'deliver', el: <Deliver />, wipe: 'diagonal' },
  { id: 'services', el: <Services />, wipe: 'circle' },
  { id: 'design', el: <Design />, wipe: 'arch' },
  { id: 'construction', el: <Construction />, wipe: 'diagonal' },
  { id: 'bulk', el: <Bulk />, wipe: 'arch' },
  { id: 'proof', el: <Proof />, wipe: 'circle' },
  { id: 'cta', el: <Cta />, wipe: 'arch' },
];

function clip(wipe: Wipe, p: number, w: number, h: number): string | undefined {
  if (wipe === 'none' || p >= 0.999) return undefined;
  switch (wipe) {
    case 'rise':
      return `inset(${(1 - p) * 100}% 0 0 0)`;
    case 'circle':
      // Grows from the light source near the top, like a lamp switching on.
      return `circle(${p * Math.hypot(w, h)}px at 50% 18%)`;
    case 'arch': {
      // The Zelqune arch, rising from the bottom edge.
      const side = (1 - p) * w * 0.32;
      return `inset(${(1 - p) * 100}% ${side}px 0 ${side}px round ${w}px ${w}px 0 0)`;
    }
    case 'diagonal': {
      const x = mix(-0.4, 1.4, p) * w;
      return `polygon(0 0, ${x}px 0, ${x - w * 0.4}px ${h}px, 0 ${h}px)`;
    }
  }
}

/** Mask-in on entry; recede (scale + dim) while the next scene wipes over it. */
function SceneWrap({ wipe, length, children }: { wipe: Wipe; length: number; children: ReactNode }) {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const enter = springAt(frame, fps, 0, springs.soft);
  const exit = springAt(frame, fps, length, springs.soft);
  return (
    <AbsoluteFill style={{ clipPath: clip(wipe, enter, width, height), transform: `scale(${mix(1, 0.94, exit)})`, filter: `brightness(${mix(1, 0.7, exit)})` }}>
      {children}
    </AbsoluteFill>
  );
}

export function Main() {
  return (
    <AbsoluteFill style={{ background: '#14110F' }}>
      {timeline.map(({ id, el, wipe }) => {
        const s = scenes[id];
        return (
          <Sequence key={id} from={beats(s.start)} durationInFrames={beats(s.length) + TRANSITION} name={id}>
            <SceneWrap wipe={wipe} length={beats(s.length)}>
              {el}
            </SceneWrap>
          </Sequence>
        );
      })}
      <Grain />
      <Soundtrack />
    </AbsoluteFill>
  );
}
