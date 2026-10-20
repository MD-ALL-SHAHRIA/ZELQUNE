#!/usr/bin/env node
// Lists every [[...]] placeholder still in the storefront copy (docs/copy-*.md as used by the
// site). Reports only: exits 0 so it can run anywhere; the site must not launch with any left.
import { readFileSync } from 'node:fs';

const files = ['../../docs/copy-en.md', '../../docs/copy-bn.md'];
let total = 0;
for (const file of files) {
  const lines = readFileSync(new URL(file, import.meta.url), 'utf8').split('\n');
  const found = [];
  lines.forEach((line, i) => {
    for (const m of line.matchAll(/\[\[[^\]]+\]\]/g)) found.push(`  ${i + 1}: ${m[0]}`);
  });
  total += found.length;
  console.log(`${file.replace('../../', '')}: ${found.length} placeholder(s)`);
  if (found.length) console.log(found.join('\n'));
}
console.log(total ? `\n${total} placeholder(s) to fill before launch.` : '\nNo placeholders left.');
