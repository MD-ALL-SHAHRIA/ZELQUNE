// Bundles once, then renders.
//   node scripts/render.mjs                      -> all three MP4s + thumbnail into out/
//   node scripts/render.mjs only <Comp...>         -> just those MP4s
//   node scripts/render.mjs stills <frames...>   -> review stills (half size) of all formats into out/stills/
//   node scripts/render.mjs stills-only <Comp> <frames...>
import { bundle } from '@remotion/bundler';
import { renderMedia, renderStill, selectComposition } from '@remotion/renderer';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const out = path.join(root, 'out');
const [mode, ...rest] = process.argv.slice(2);
const formats = ['Reels-9x16', 'Feed-4x5', 'Web-16x9'];

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
      serveUrl, composition, codec: 'h264', crf: 16, pixelFormat: 'yuv420p', imageFormat: 'jpeg', jpegQuality: 95,
      outputLocation: path.join(out, `zelqune-${id.toLowerCase()}.mp4`),
      onProgress: ({ progress }) => process.stdout.write(`\r${id} ${Math.round(progress * 100)}%`),
    });
    console.log();
  }
  if (mode !== 'only') await renderStill({ serveUrl, composition: await comp('Thumbnail'), output: path.join(out, 'zelqune-thumbnail-1080.png') });
}
console.log('done');
