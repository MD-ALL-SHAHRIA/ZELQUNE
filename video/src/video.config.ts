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
  services: { start: 68, length: 6 },
  design: { start: 74, length: 7 },
  construction: { start: 81, length: 7 },
  bulk: { start: 88, length: 7 },
  proof: { start: 95, length: 11 },
  cta: { start: 106, length: 14 },
} as const;
export type SceneId = keyof typeof scenes;

/**
 * Every on-screen action, in frames from the start of its scene. Animations and their sounds both
 * read these, so moving a timing moves its sound with it.
 */
export const timing = {
  hook: { sweep: 26 },
  /** Problem: three cold cuts two beats apart, then the turn to the lit piece. */
  problem: { cuts: [0, beats(2), beats(4)], turn: beats(6), bloom: beats(6) + 22 },
  reveal: { logo: 0, laptop: 40, phone: 50 },
  /** Camera rhythm: wide → scroll → push in → hover → spotlight → click → lift out → fan → hold. */
  /**
   * Website section beats. pushes = camera push-ins, clicks = cursor clicks, lifts = glass lift-outs,
   * flips = page changes on the device. Sounds are cued from these same arrays.
   */
  find: { scroll: 8, push: 34, cursorIn: 46, cursorMove: 52, hover: 64, spot: 70, click: 84, lift: 90, cards: 98, cardStagger: 6, callout: 110,
    pushes: [34], clicks: [84], lifts: [90, 98, 104], flips: [] as number[] },
  moods: { push: 8, cursorMove: 36, toggle: 44, click: 62, pull: 76, lift: 98, callout: 112, pill: 30,
    pushes: [8, 44, 76], clicks: [62], lifts: [98], flips: [] as number[] },
  reserve: { push: 8, spot: 26, lift: 52, fanStagger: 6, count: 72, countFrames: 40, toast: 118, callout: 100,
    pushes: [8], clicks: [] as number[], lifts: [52, 58, 64], flips: [] as number[] },
  deliver: {
    push: 8, cursorIn: 14, focus: beats(2),
    /** Typing: one character every `perChar` frames; the phone number follows after `gap`. */
    typeStart: beats(2) + 6, perChar: 2, gap: 6,
    buttonPush: 84, buttonMove: 86, click: 98, lift: 106, toast: 112,
    pushes: [8, 84], clicks: [beats(2), 98], lifts: [106], flips: [] as number[] },
  services: { items: 16, itemStagger: 5, montage: 46, flipEvery: 11, pushes: [] as number[], clicks: [] as number[], lifts: [] as number[], flips: [46, 57, 68, 79] },
  design: { menuClick: 16, menuOpen: 18, linkClick: 40, page: 44, push: 52, lift: 74, callout: 86,
    pushes: [52], clicks: [16, 40], lifts: [74], flips: [18, 44] },
  construction: { push: 6, page: 34, push2: 40, lift: 58, fanStagger: 6, callout: 80,
    pushes: [6, 40], clicks: [] as number[], lifts: [58, 64, 70], flips: [34] },
  bulk: { scroll: 6, push: 38, spot: 54, lift: 66, callout: 82,
    pushes: [38], clicks: [] as number[], lifts: [66], flips: [] as number[] },
  proof: { cards: 10, cardStagger: 6, count: 14, countFrames: 40 },
  cta: { logo: 2, button: beats(3), url: beats(4) },
} as const;

/** Frames the outgoing scene stays mounted under the incoming wipe. */
export const TRANSITION = 14;
export const TOTAL_BEATS = 120;
export const DURATION = beats(TOTAL_BEATS); // 1800 frames = 60 s

export const copy = {
  hook: ['Your walls', 'feel empty.'],
  problem: {
    words: ['Bare.', 'Cold.', 'Forgettable.'],
    turn: 'Then the light comes on.',
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
