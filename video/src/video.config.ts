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
  reveal: { start: 16, length: 10 },
  find: { start: 26, length: 11 },
  moods: { start: 37, length: 11 },
  reserve: { start: 48, length: 10 },
  deliver: { start: 58, length: 10 },
  services: { start: 68, length: 4 },
  design: { start: 72, length: 7 },
  construction: { start: 79, length: 7 },
  bulk: { start: 86, length: 7 },
  proof: { start: 93, length: 11 },
  cta: { start: 104, length: 14 },
} as const;
export type SceneId = keyof typeof scenes;

/**
 * Every on-screen action, in frames from the start of its scene. Animations and their sounds both
 * read these, so moving a timing moves its sound with it.
 */
export const timing = {
  /** Opening: the arch draws itself from frame 0; the panel inside lights at `light`; words at `words`. */
  hook: { sweep: 26, light: 22, words: 30 },
  /** Problem: three cold cuts two beats apart, then the turn to the lit piece. */
  problem: { cuts: [0, beats(2), beats(4)], turn: beats(6), bloom: beats(6) + 22 },
  reveal: { logo: 0, laptop: 40, phone: 50 },
  find: { cursorIn: beats(1), cursorMove: beats(1.8), click: beats(4), cards: beats(4) + 6, cardStagger: 4 },
  moods: { pill: beats(2), cursorIn: beats(1.5), cursorMove: beats(2.5), click: beats(4.5) },
  reserve: { card: beats(1.5), count: beats(2), countFrames: 40, dots: beats(3), dotStagger: 8, toast: beats(6.5) },
  deliver: {
    cursorIn: beats(0.8), cursorMove: beats(1.2), focus: beats(2),
    /** Typing: one character every `perChar` frames; the phone number follows after `gap`. */
    typeStart: beats(2) + 6, perChar: 2, gap: 6,
    buttonMove: beats(5.8), click: beats(6.5), toast: beats(6.5) + 8,
  },
  services: { items: 16, itemStagger: 5 },
  proof: { cards: 10, cardStagger: 6, count: 14, countFrames: 40 },
  cta: { logo: 2, button: beats(3), url: beats(4) },
} as const;

/** Frames the outgoing scene stays mounted under the incoming wipe. */
export const TRANSITION = 14;
export const TOTAL_BEATS = 118;
export const DURATION = beats(TOTAL_BEATS); // 1770 frames = 59 s

export const copy = {
  hook: ['Light that feels', 'like home.'],
  problem: {
    words: ['Handcrafted.', 'Warm.', 'Yours.'],
    turn: 'Made by hand, for your home.',
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
    phone: '01712 345678',
    toast: { title: 'Out for delivery', text: 'Cash on delivery · arriving today' },
  },
  services: {
    title: ['Need a whole', 'space?'],
    items: [
      { id: 'design', index: '01', name: 'Interior design', caption: 'Rooms designed around light' },
      { id: 'construction', index: '02', name: 'Construction', caption: 'From the ground to last light' },
      { id: 'bulk', index: '03', name: 'Bulk & corporate', caption: 'Offices and gifts, made in bulk' },
    ],
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
  productNightDesktop: 'screens/product-night-desktop.png',
  productNightMobile: 'screens/product-night-mobile.png',
  trackFilledDesktop: 'screens/track-filled-desktop.png',
  trackFilledMobile: 'screens/track-filled-mobile.png',
  designDesktop: 'screens/design-desktop.png',
  designMobile: 'screens/design-mobile.png',
  constructionDesktop: 'screens/construction-desktop.png',
  constructionMobile: 'screens/construction-mobile.png',
  bulkDesktop: 'screens/bulk-desktop.png',
  bulkMobile: 'screens/bulk-mobile.png',
  shopDesktop: 'screens/shop-desktop.png',
  shopMobile: 'screens/shop-mobile.png',
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
  musicVolume: 0.9,
  /** Music drops by this factor (about -6 dB) under dense SFX moments. */
  duck: 0.5,
  fadeIn: 15,
  fadeOut: 45,
  sfxVolume: 0.6,
} as const;

/** Spring presets (the only easing used). */
export const springs = {
  soft: { damping: 200, mass: 1 },
  snappy: { damping: 18, stiffness: 160, mass: 0.7 },
  pop: { damping: 12, stiffness: 180, mass: 0.6 },
  camera: { damping: 40, stiffness: 40, mass: 1.2 },
} as const;
