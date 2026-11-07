import { Composition, Still } from 'remotion';
import { Main } from './Main';
import { Thumbnail } from './Thumbnail';
import { DURATION, FPS } from './video.config';

export const formats = [
  { id: 'Reels-9x16', width: 1080, height: 1920 },
  { id: 'Feed-4x5', width: 1080, height: 1350 },
  { id: 'Web-16x9', width: 1920, height: 1080 },
] as const;

export function Root() {
  return (
    <>
      {formats.map((f) => (
        <Composition key={f.id} id={f.id} component={Main} durationInFrames={DURATION} fps={FPS} width={f.width} height={f.height} />
      ))}
      <Still id="Thumbnail" component={Thumbnail} width={1080} height={1080} />
    </>
  );
}
