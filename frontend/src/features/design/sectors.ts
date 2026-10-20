import { SAMPLE, SAMPLE_SECTOR } from '@/content/sample-images';

/** Interior design sectors: URL slug <-> the RFQ space type (ADR 0014). */
export const SECTORS = [
  { slug: 'home', space: 'HOME' },
  { slug: 'office', space: 'OFFICE' },
  { slug: 'restaurant-cafe', space: 'RESTAURANT_CAFE' },
  { slug: 'hotel', space: 'HOTEL' },
  { slug: 'retail', space: 'RETAIL' },
] as const;

export type Sector = (typeof SECTORS)[number];
export type SectorSpace = Sector['space'];

export function sectorBySlug(slug: string): Sector | undefined {
  return SECTORS.find((s) => s.slug === slug);
}

export function sectorImages(space: SectorSpace): string[] {
  return SAMPLE_SECTOR[space].map((key) => SAMPLE[key].src);
}
