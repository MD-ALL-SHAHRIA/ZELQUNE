import { Audio, Sequence, getStaticFiles, staticFile } from 'remotion';
import { audio } from '../video.config';
import { buildCues, musicGain, typingCues, type Cue } from './cues';

const path = (name: string) => `sfx/${name}.mp3`;

function useHas() {
  const files = new Set(getStaticFiles().map((f) => f.name));
  return (name: string) => files.has(name);
}

function Play({ c }: { c: Cue }) {
  return (
    <Sequence from={c.frame} durationInFrames={c.frames} layout="none" name={`sfx: ${c.event}`}>
      <Audio src={staticFile(path(c.sfx))} volume={c.volume * audio.sfxVolume} playbackRate={c.rate} />
    </Sequence>
  );
}

/** One sound effect at an absolute frame. */
export function SFX({ name, at, volume = 0.5, rate = 1 }: { name: string; at: number; volume?: number; rate?: number }) {
  const has = useHas();
  if (!has(path(name))) return null;
  return <Play c={{ frame: at, sfx: name, volume, rate, event: name, frames: 60 }} />;
}

/** Human keystrokes for `text`, one per character from `startFrame`. */
export function TypingSound({ text, startFrame, perChar = 2 }: { text: string; startFrame: number; perChar?: number }) {
  const has = useHas();
  return (
    <>
      {typingCues(text, startFrame, perChar, text).filter((c) => has(path(c.sfx))).map((c, i) => <Play key={i} c={c} />)}
    </>
  );
}

/** The full soundtrack: music (fades + ducking) and every cue from cues.ts. */
export function Soundtrack() {
  const has = useHas();
  return (
    <>
      {has(audio.music) && <Audio src={staticFile(audio.music)} volume={(f) => musicGain(f)} />}
      {buildCues().filter((c) => has(path(c.sfx))).map((c, i) => <Play key={i} c={c} />)}
    </>
  );
}
