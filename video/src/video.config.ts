/**
 * Every text, colour and timing in the promo video lives here. Timings are in beats of a
 * 120 BPM grid (1 beat = 0.5 s = 15 frames at 30 fps), so cuts land on the music.
 */
export const FPS = 30;
export const BPM = 120;
export const BEAT = (60 / BPM) * FPS; // 15 frames
export const beats = (n: number) => Math.round(n * BEAT);

/** Brand colours, from packages/ui-tokens. */
export const colors = {
  paper: '#F7F1E8',
  cream: '#F2EADF',
  sand: '#EFE6D8',
  line: '#E4D8C6',
  espresso: '#3B2922',
  night: '#14110F',
  walnut: '#7A5C30',
  brass: '#D9B47A',
  glow: '#E9B872',
  stone: '#75604F',
  /** The cold "before" world. */
  cold: '#C9D3DC',
  coldDeep: '#1B2229',
} as const;

export const fonts = {
  display: 'Cormorant Garamond',
  ui: 'Jost',
  /** Only for the ৳ glyph, which neither brand face has. */
  taka: 'ZelquneTaka',
} as const;

/** Scene order and length, in beats. Each next scene wipes over the previous one. */
export const scenes = {
  hook: { start: 0, length: 6 },
  problem: { start: 6, length: 10 },
  reveal: { start: 16, length: 8 },
  find: { start: 24, length: 11 },
  moods: { start: 35, length: 11 },
  reserve: { start: 46, length: 11 },
  deliver: { start: 57, length: 11 },
  proof: { start: 68, length: 10 },
  cta: { start: 78, length: 12 },
} as const;
export type SceneId = keyof typeof scenes;

/** Frames the outgoing scene stays mounted under the incoming wipe. */
export const TRANSITION = 14;
export const TOTAL_BEATS = 90;
export const DURATION = beats(TOTAL_BEATS); // 1350 frames = 45 s

export const copy = {
  hook: ['Your walls', 'feel cold.'],
  problem: {
    lines: ['Bare walls.', 'Harsh white light.', 'Decor like everyone else’s.'],
  },
  reveal: { kicker: 'Meet', wordmark: 'ZELQUNE' },
  find: { caption: 'Find the piece your wall needs', label: 'Handcrafted in Dhaka' },
  moods: { caption: 'A vase by day, lamp by night', day: 'Day', night: 'Night', label: 'Safe 5V light' },
  reserve: {
    caption: 'Reserve it with just ৳300',
    amount: 300,
    toast: { title: 'Pre-order confirmed', text: 'Alo-Arch Panel · made within 10 days' },
  },
  deliver: {
    caption: 'Pay the rest at your door',
    code: 'ZQ-4K7P2M',
    toast: { title: 'Out for delivery', text: 'Cash on delivery · arriving today' },
  },
  proof: {
    lines: ['Made by hand.', 'Delivered everywhere.'],
    stats: [
      { value: 64, prefix: '', suffix: '', label: 'districts delivered' },
      { value: 10, prefix: '', suffix: ' days', label: 'to make yours' },
      { value: 300, prefix: '৳', suffix: '', label: 'to reserve' },
      { value: 5, prefix: '', suffix: 'V', label: 'safe warm light' },
    ],
  },
  cta: {
    tagline: 'The warmth of wood and light, at home.',
    button: 'Shop the collection',
    url: 'zelqune.com',
  },
} as const;

/** Real storefront captures (scripts/capture.mjs), 2x DPR. */
export const screens = {
  homeDesktop: 'screens/home-desktop.png',
  homeMobile: 'screens/home-mobile.png',
  shopDesktop: 'screens/shop-desktop.png',
  shopMobile: 'screens/shop-grid-mobile.png',
  productDesktop: 'screens/product-desktop.png',
  productMobile: 'screens/product-mobile.png',
  stepsDesktop: 'screens/home-steps-desktop.png',
  stepsMobile: 'screens/home-steps-mobile.png',
  trackDesktop: 'screens/track-desktop.png',
  trackMobile: 'screens/track-mobile.png',
  cards: ['screens/card-1.png', 'screens/card-2.png', 'screens/card-3.png'],
} as const;

/** Optional audio: drop the files in assets/ and they are picked up on the next render. */
export const audio = {
  music: 'music.mp3',
  musicVolume: 0.7,
  whoosh: 'sfx/whoosh.mp3',
  click: 'sfx/click.mp3',
  sfxVolume: 0.5,
} as const;

/** Spring presets (the only easing used). */
export const springs = {
  soft: { damping: 200, mass: 1 },
  snappy: { damping: 18, stiffness: 160, mass: 0.7 },
  pop: { damping: 12, stiffness: 180, mass: 0.6 },
  camera: { damping: 40, stiffness: 40, mass: 1.2 },
} as const;
