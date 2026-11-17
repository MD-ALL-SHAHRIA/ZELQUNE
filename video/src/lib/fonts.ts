import { loadFont as loadCormorant } from '@remotion/google-fonts/CormorantGaramond';
import { loadFont as loadJost } from '@remotion/google-fonts/Jost';
import { continueRender, delayRender, staticFile } from 'remotion';
import { fonts } from '../video.config';

loadCormorant('normal', { weights: ['400', '500'], subsets: ['latin'] });
loadCormorant('italic', { weights: ['400'], subsets: ['latin'] });
loadJost('normal', { weights: ['400', '500'], subsets: ['latin'] });

// ৳ is not in the brand faces; Hind Siliguri (the storefront's Bengali face) supplies only that glyph.
const handle = delayRender('taka font');
const taka = new FontFace(fonts.taka, `url(${staticFile('brand/hind-siliguri-600-bengali.woff2')})`, {
  unicodeRange: 'U+09F3',
});
taka
  .load()
  .then((f) => document.fonts.add(f))
  .finally(() => continueRender(handle));

export const display = `'${fonts.display}', '${fonts.taka}', Georgia, serif`;
export const ui = `'${fonts.ui}', '${fonts.taka}', system-ui, sans-serif`;
