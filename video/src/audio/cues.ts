import { random, spring } from 'remotion';
import { typingSchedule } from '../lib/typing';
import { BEAT, DURATION, FPS, audio, beats, copy, scenes, springs, timing, type SceneId } from '../video.config';

export const SFX = {
  key: ['key-1', 'key-2', 'key-3', 'key-4', 'key-5', 'key-6', 'key-7', 'key-8'],
  click: 'click', toggle: 'toggle', pop: 'pop', tick: 'tick', chime: 'chime', shimmer: 'shimmer',
  whoosh: ['whoosh-1', 'whoosh-2', 'whoosh-3'], riser: 'riser', impact: 'impact',
} as const;

/** Frames each SFX file is allowed to ring (Sequence length). */
const RING: Record<string, number> = { riser: 75, impact: 150, chime: 75, shimmer: 75 };

export type Cue = { frame: number; sfx: string; volume: number; rate: number; event: string; frames: number };

const at = (scene: SceneId, rel: number) => beats(scenes[scene].start) + rel;
const cue = (frame: number, sfx: string, volume: number, event: string, rate = 1): Cue => ({
  frame: Math.max(0, Math.round(frame)), sfx, volume, rate, event, frames: RING[sfx] ?? 40,
});

/** One keystroke per character: random key, pitch 0.95–1.05, volume 0.5–0.8 (human, not robotic). */
export function typingCues(text: string, start: number, perChar: number, label: string): Cue[] {
  return text.split('').map((ch, i) => {
    const r = (k: string) => random(`${label}-${i}-${k}`);
    const key = SFX.key[Math.floor(r('k') * SFX.key.length)];
    const space = ch === ' ';
    return cue(start + i * perChar, key, (0.5 + r('v') * 0.3) * (space ? 0.8 : 1), `Types "${ch}" (${label})`, space ? 0.9 : 0.95 + r('p') * 0.1);
  });
}

/** Ticks while a spring counter climbs (one per visible step), and a chime when it settles. */
function counterCues(start: number, value: number, steps: number, label: string, chime: boolean): Cue[] {
  const out: Cue[] = [];
  let last = 0;
  for (let f = 0; f < 120; f++) {
    const v = spring({ frame: f, fps: FPS, config: springs.camera }) * value;
    if (Math.floor((v / value) * steps) > last && last < steps - 1) {
      last = Math.floor((v / value) * steps);
      out.push(cue(start + f, SFX.tick, 0.35, `${label} counter ticks (${Math.round(v)})`, 0.9 + (last / steps) * 0.2));
    }
    if (Math.round(v) >= value) {
      if (chime) out.push(cue(start + f, SFX.chime, 0.5, `${label} counter lands on ${value}`));
      break;
    }
  }
  return out;
}

export function buildCues(): Cue[] {
  const c: Cue[] = [];
  const order: SceneId[] = ['hook', 'problem', 'reveal', 'find', 'moods', 'reserve', 'deliver', 'services', 'design', 'construction', 'bulk', 'proof', 'cta'];
  // Whoosh ~4 frames before every cut (not where an impact already marks the cut).
  order.slice(1).forEach((id, i) => {
    if (id === 'problem' || id === 'reveal') return;
    c.push(cue(beats(scenes[id].start) - 4, SFX.whoosh[i % 3], 0.45, `Transition into ${id}`));
  });

  // Hook + problem.
  c.push(cue(0, SFX.impact, 0.7, 'Headline "Your walls feel empty." lands'));
  c.push(cue(at('hook', timing.hook.sweep), SFX.shimmer, 0.18, 'Light band sweeps the headline'));
  copy.problem.words.forEach((w, i) => c.push(cue(at('problem', timing.problem.cuts[i]), SFX.impact, 0.6 + i * 0.1, `Cold cut: "${w}"`)));
  c.push(cue(at('problem', timing.problem.turn), SFX.riser, 0.55, 'Camera swings to the panel; riser into the reveal'));
  c.push(cue(at('problem', timing.problem.bloom), SFX.shimmer, 0.25, 'The panel lights up'));

  // Reveal: impact exactly on the logo frame (a bar downbeat).
  c.push(cue(at('reveal', timing.reveal.logo), SFX.impact, 1, 'Logo reveal (downbeat)'));
  c.push(cue(at('reveal', timing.reveal.laptop) - 4, SFX.whoosh[1], 0.35, 'Laptop glides in'));
  c.push(cue(at('reveal', timing.reveal.phone) - 2, SFX.whoosh[2], 0.25, 'Phone glides in'));

  // Find.
  const F = timing.find;
  c.push(cue(at('find', F.click), SFX.click, 0.7, 'Cursor clicks the first product card'));
  for (let i = 0; i < 3; i++) c.push(cue(at('find', F.cards + i * F.cardStagger), SFX.pop, 0.45, `Product card ${i + 1} pops out`, 0.95 + i * 0.05));

  // Moods.
  const M = timing.moods;
  c.push(cue(at('moods', M.pill), SFX.pop, 0.25, 'Day/Night switch appears (phone formats)'));
  c.push(cue(at('moods', M.click), SFX.click, 0.7, 'Clicks the dark-mode toggle'));
  c.push(cue(at('moods', M.click) + 1, SFX.toggle, 0.5, 'Toggle flips to Night'));
  c.push(cue(at('moods', M.click) + 4, SFX.shimmer, 0.3, 'Night theme spreads across the page'));

  // Reserve.
  const R = timing.reserve;
  c.push(cue(at('reserve', R.card), SFX.pop, 0.45, 'Advance card pops in'));
  c.push(...counterCues(at('reserve', R.count), copy.reserve.amount, 10, '৳300', true));
  for (let i = 0; i < 3; i++) c.push(cue(at('reserve', R.dots + i * R.dotStagger), SFX.pop, 0.3, `Timeline step ${i + 1} draws`, 1.1 + i * 0.06));
  c.push(cue(at('reserve', R.toast), SFX.pop, 0.4, '"Pre-order confirmed" slides in'));
  c.push(cue(at('reserve', R.toast) + 3, SFX.chime, 0.45, 'Pre-order confirmed chime'));

  // Deliver: click the field, type both fields, click Track.
  const D = timing.deliver;
  const sched = typingSchedule();
  c.push(cue(at('deliver', D.focus), SFX.click, 0.6, 'Clicks the order-code field'));
  sched.fields.forEach((f, i) => c.push(...typingCues(f.text, at('deliver', f.start), sched.perChar, i === 0 ? 'order code' : 'phone')));
  c.push(cue(at('deliver', D.click), SFX.click, 0.75, 'Clicks Track'));
  c.push(cue(at('deliver', D.toast), SFX.pop, 0.4, '"Out for delivery" slides in'));
  c.push(cue(at('deliver', D.toast) + 3, SFX.chime, 0.45, 'Out for delivery chime', 1.12));

  // Services.
  c.push(cue(at('services', 0), SFX.impact, 0.5, 'Services title "Need a whole space?"'));
  copy.services.items.forEach((it, i) => c.push(cue(at('services', timing.services.items + i * timing.services.itemStagger), SFX.pop, 0.3, `${it.index} ${it.name} appears`, 1 + i * 0.06)));

  // Proof.
  const P = timing.proof;
  copy.proof.stats.forEach((s, i) => {
    c.push(cue(at('proof', P.cards + i * P.cardStagger), SFX.pop, 0.35, `Stat card "${s.label}" pops in`, 0.95 + i * 0.05));
    c.push(...counterCues(at('proof', P.count + i * P.cardStagger), s.value, Math.min(6, s.value), s.label, i === copy.proof.stats.length - 1));
  });

  // CTA.
  c.push(cue(at('cta', 0), SFX.impact, 0.75, 'Final logo lands (downbeat)'));
  c.push(cue(at('cta', timing.cta.logo) + 4, SFX.shimmer, 0.4, 'CTA shimmer on the logo'));
  c.push(cue(at('cta', timing.cta.button), SFX.pop, 0.45, '"Shop the collection" button pops in'));

  return c.filter((x) => x.frame < DURATION).sort((a, b) => a.frame - b.frame);
}

/** Windows (frames) where the music ducks ~6 dB under dense SFX. */
export function duckWindows(): [number, number][] {
  const sched = typingSchedule();
  const typeStart = at('deliver', sched.fields[0].start);
  const typeEnd = at('deliver', sched.fields[1].start + sched.fields[1].text.length * sched.perChar);
  return [
    [typeStart - 6, typeEnd + 6],
    [at('reserve', timing.reserve.count), at('reserve', timing.reserve.count + 45)],
    [at('proof', timing.proof.count), at('proof', timing.proof.count + 3 * timing.proof.cardStagger + 45)],
  ];
}

/** Music gain at a frame: fade in/out plus smooth ducking. */
export function musicGain(frame: number): number {
  const fin = Math.min(1, frame / audio.fadeIn);
  const fout = Math.min(1, (DURATION - frame) / audio.fadeOut);
  let duck = 1;
  for (const [a, b] of duckWindows()) {
    const ramp = 8;
    const k = frame < a - ramp || frame > b + ramp ? 0 : frame < a ? (frame - (a - ramp)) / ramp : frame > b ? (b + ramp - frame) / ramp : 1;
    duck = Math.min(duck, 1 - (1 - audio.duck) * k);
  }
  return audio.musicVolume * Math.max(0, fin) * Math.max(0, fout) * duck;
}


