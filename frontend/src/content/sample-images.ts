/**
 * Sample photography until real product photos exist (owner's decision, step 1.4 redesign).
 * All images are from Unsplash under the Unsplash License (free for commercial use, no
 * attribution required; credited here anyway). Product photos uploaded through the admin
 * dashboard replace them automatically (the catalog's media always wins).
 * Shown with a "sample photo" note where they stand in for the product. Remove before launch.
 */
const unsplash = (photo: string) => `https://images.unsplash.com/${photo}`;

export const SAMPLE = {
  hero: {
    src: unsplash('photo-1781875483636-a5db78e2978d'),
    credit: 'Leonardo Scharm (YoLzukVa7P8)',
  },
  productTubes: {
    src: unsplash('photo-1723315420732-1b0973f529dd'),
    credit: 'monica dahiya (TVjMalc515c)',
  },
  dayVase: {
    src: unsplash('photo-1578500351865-d6c3706f46bc'),
    credit: 'Katsia Jazwinska (jJi31q3OKog)',
  },
  nightVase: {
    src: unsplash('photo-1744549259903-90606e3766d6'),
    credit: 'nilufar nattaq (UwuZqIKgVWI)',
  },
  craft: {
    src: unsplash('photo-1497219055242-93359eeed651'),
    credit: 'Dominik Scythe (3cIvvzjE6Lk)',
  },
  craftDetail: {
    src: unsplash('photo-1455297463052-94abc38ba022'),
    credit: 'Roman Kraft (HNtcFpXeq4c)',
  },
  bedroom: {
    src: unsplash('photo-1764760764956-fcb78be107a5'),
    credit: 'Archee Lal (hkCXcR2mcds)',
  },
  living: {
    src: unsplash('photo-1769117549887-d7ab37279060'),
    credit: 'Helena Lopes (Kojm4nCE65c)',
  },
  cafe: { src: unsplash('photo-1749871615234-98bff62995ba'), credit: 'Kouji Tsuru (0i5clWZBit0)' },
  office: {
    src: unsplash('photo-1621293954908-907159247fc8'),
    credit: 'Frames For Your Heart (zSG-kd-L6vw)',
  },
  testTubes: {
    src: unsplash('photo-1536316754104-90daa92e4eb0'),
    credit: 'bady abbas (uZoR8U2hyiw)',
  },
  pampas: {
    src: unsplash('photo-1756767236316-1e8196a67fd2'),
    credit: 'Martin Baron (Ixl9zMwdmEs)',
  },
  homeHero: {
    src: unsplash('photo-1774200981075-a728eaaa3824'),
    credit: 'Clay Banks (Hnec2oEbbxk)',
  },
  livingNeutral: {
    src: unsplash('photo-1747336754870-ca7b10cc75f5'),
    credit: 'Luis J. Corniel (bJGBQj5cf6w)',
  },
  livingShelves: {
    src: unsplash('photo-1772797583328-f83bc3f94f80'),
    credit: 'Puscas Adryan (2cfj0Y5ch00)',
  },
  shelvesPlants: {
    src: unsplash('photo-1560105908-5d41e79c1043'),
    credit: 'Tania Mirón (umYxSxMncT4)',
  },
  shelvesDecor: {
    src: unsplash('photo-1746933156614-54eeb2dfaf3c'),
    credit: 'Brooke Balentine (DyBC0dKD-jc)',
  },
  slats: {
    src: unsplash('photo-1722109997425-40f920848aed'),
    credit: 'Maksim Shutov (YpK65tUQipg)',
  },
  slatsWarm: {
    src: unsplash('photo-1738666831048-fc9e53345692'),
    credit: 'Declan Sun (MEUtre4hH3o)',
  },
  sconce: { src: unsplash('photo-1566739262652-879e15c9dcdb'), credit: 'unknown (ZT2MJ-8_B2I)' },
  sconceNight: {
    src: unsplash('photo-1501471984908-815b996862f4'),
    credit: 'unknown (eIVJAkj1uCs)',
  },
  restaurant: {
    src: unsplash('photo-1752758059740-fd250168138e'),
    credit: 'Declan Sun (UtbfBl-umcA)',
  },
  cafeLights: {
    src: unsplash('photo-1744561249162-c597c1670032'),
    credit: 'Raymond Yeung (Wzo_34cS5bA)',
  },
  lobby: { src: unsplash('photo-1758448721205-8465cebc26af'), credit: 'Aalo Lens (tUcVQwXsNck)' },
  hotelLobby: {
    src: unsplash('photo-1758448093806-88b2089068ab'),
    credit: 'Aalo Lens (Ypv0MH4izf8)',
  },
  retail: {
    src: unsplash('photo-1689297651498-2395488aa1b0'),
    credit: 'Markus Winkler (wd6xbwsjqpU)',
  },
  dining: { src: unsplash('photo-1773847521422-77ff84e29353'), credit: 'Clay Banks (bcaFHquzu3M)' },
} as const;

type SampleKey = keyof typeof SAMPLE;

/** Lookalike photos per product (by slug) until the real photos are uploaded. */
export const SAMPLE_PRODUCT_GALLERY: Record<string, SampleKey[]> = {
  'alo-arch-panel': ['productTubes', 'testTubes', 'dayVase', 'nightVase'],
  'diamond-shelf-pair': ['shelvesPlants', 'shelvesDecor', 'livingShelves'],
  'wave-shelf': ['shelvesDecor', 'shelvesPlants', 'livingNeutral'],
  'half-moon-planter-light': ['livingNeutral', 'living', 'sconceNight'],
  'fluted-niche-panel': ['slatsWarm', 'hotelLobby', 'slats'],
  'capsule-vase-light': ['dayVase', 'productTubes', 'nightVase'],
};

/** Photos for the interior design sectors (by space type). */
export const SAMPLE_SECTOR: Record<
  'HOME' | 'OFFICE' | 'RESTAURANT_CAFE' | 'HOTEL' | 'RETAIL',
  SampleKey[]
> = {
  HOME: ['livingNeutral', 'homeHero', 'bedroom'],
  OFFICE: ['office', 'lobby'],
  RESTAURANT_CAFE: ['cafeLights', 'restaurant', 'cafe'],
  HOTEL: ['hotelLobby', 'bedroom'],
  RETAIL: ['retail', 'slatsWarm'],
};
