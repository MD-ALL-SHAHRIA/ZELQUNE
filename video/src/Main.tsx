import type { ReactNode } from 'react';
import { AbsoluteFill, Audio, Sequence, getStaticFiles, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
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
import { Service } from './scenes/Service';
import { Services } from './scenes/Services';
import { TRANSITION, audio, beats, scenes, springs, type SceneId } from './video.config';

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
  { id: 'design', el: <Service id="design" />, wipe: 'arch' },
  { id: 'construction', el: <Service id="construction" />, wipe: 'diagonal' },
  { id: 'bulk', el: <Service id="bulk" />, wipe: 'arch' },
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
  const files = new Set(getStaticFiles().map((f) => f.name));
  const has = (name: string) => files.has(name);
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
      {has(audio.music) && <Audio src={staticFile(audio.music)} volume={audio.musicVolume} />}
      {has(audio.whoosh) &&
        timeline.slice(1).map(({ id }) => (
          <Sequence key={`w-${id}`} from={Math.max(0, beats(scenes[id].start) - 4)} durationInFrames={30}>
            <Audio src={staticFile(audio.whoosh)} volume={audio.sfxVolume} />
          </Sequence>
        ))}
      {has(audio.click) &&
        [beats(scenes.find.start + 4), beats(scenes.moods.start + 4.5), beats(scenes.deliver.start + 2), beats(scenes.deliver.start + 5.5)].map((f) => (
          <Sequence key={`c-${f}`} from={f} durationInFrames={15}>
            <Audio src={staticFile(audio.click)} volume={audio.sfxVolume} />
          </Sequence>
        ))}
    </AbsoluteFill>
  );
}
