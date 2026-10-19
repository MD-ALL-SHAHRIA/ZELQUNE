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
} as const;
