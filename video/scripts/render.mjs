// Bundles once, then renders.
//   node scripts/render.mjs                      -> all three MP4s + thumbnail into out/
//   node scripts/render.mjs only <Comp...>         -> just those MP4s
//   node scripts/render.mjs stills <frames...>   -> review stills (half size) of all formats into out/stills/
//   node scripts/render.mjs stills-only <Comp> <frames...>
import { bundle } from '@remotion/bundler';
import { renderMedia, renderStill, selectComposition } from '@remotion/renderer';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const out = path.join(root, 'out');
const [mode, ...rest] = process.argv.slice(2);
const formats = ['Reels-9x16', 'Feed-4x5', 'Web-16x9'];
// SCALE=2 renders at double resolution (3840×2160, 2160×3840, 2160×2700) into *-4k files.
const SCALE = Number(process.env.SCALE ?? 1);
const SUFFIX = SCALE === 2 ? '-4k' : SCALE !== 1 ? `-x${SCALE}` : '';

// Master the mix: two-pass loudnorm to -14 LUFS integrated, -1 dBTP true peak, AAC 320 kbps.
// TP target sits 0.5 dB under the -1 dBTP ceiling to absorb AAC encoder overshoot.
const LN = 'loudnorm=I=-14:TP=-1.5:LRA=11';
function master(raw, final) {
  const probe = spawnSync('ffmpeg', ['-hide_banner', '-i', raw, '-af', `${LN}:print_format=json`, '-f', 'null', '-'], { encoding: 'utf8' });
  const m = JSON.parse(probe.stderr.slice(probe.stderr.lastIndexOf('{'), probe.stderr.lastIndexOf('}') + 1));
  const af = `${LN}:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`;
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', raw, '-c:v', 'copy', '-af', af, '-ar', '48000', '-c:a', 'aac', '-b:a', '320k', '-movflags', '+faststart', final]);
  rmSync(raw);
}

const serveUrl = await bundle({ entryPoint: path.join(root, 'src/index.ts'), publicDir: path.join(root, 'assets') });
const comp = (id) => selectComposition({ serveUrl, id });

if (mode === 'stills' || mode === 'stills-only') {
  const ids = mode === 'stills-only' ? [rest.shift()] : formats;
  mkdirSync(path.join(out, 'stills'), { recursive: true });
  for (const id of ids) {
    const composition = await comp(id);
    for (const f of rest.map(Number)) {
      await renderStill({ serveUrl, composition, frame: f, scale: 0.5, imageFormat: 'jpeg', output: path.join(out, 'stills', `${id}-${String(f).padStart(4, '0')}.jpg`) });
    }
  }
} else {
  mkdirSync(out, { recursive: true });
  for (const id of mode === 'only' ? rest : formats) {
    const composition = await comp(id);
    await renderMedia({
      serveUrl, composition, codec: 'h264', crf: SCALE > 1 ? 18 : 16, scale: SCALE, audioBitrate: '320k', pixelFormat: 'yuv420p', imageFormat: 'jpeg', jpegQuality: 95,
      outputLocation: path.join(out, `zelqune-${id.toLowerCase()}${SUFFIX}.raw.mp4`),
      onProgress: ({ progress }) => process.stdout.write(`\r${id} ${Math.round(progress * 100)}%`),
    });
    console.log();
    master(path.join(out, `zelqune-${id.toLowerCase()}${SUFFIX}.raw.mp4`), path.join(out, `zelqune-${id.toLowerCase()}${SUFFIX}.mp4`));
  }
  if (mode !== 'only') await renderStill({ serveUrl, composition: await comp('Thumbnail'), scale: SCALE, output: path.join(out, SCALE === 2 ? 'zelqune-thumbnail-2160.png' : 'zelqune-thumbnail-1080.png') });
}
console.log('done');
