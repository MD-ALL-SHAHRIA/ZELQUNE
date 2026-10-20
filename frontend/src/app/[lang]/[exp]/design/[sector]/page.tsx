import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { sectorBySlug, sectorImages } from '@/features/design/sectors';
import {
  ConsultSection,
  DesignHero,
  DesignProcess,
  Included,
  SectorGrid,
} from '@/features/design/sections';
import { listDistricts } from '@/shared/api/server';
import { resolvePage } from '@/shared/lib/page-params';
import { alternates } from '@/shared/lib/site';

export const revalidate = 3600;

// ISR: rendered on first request, then cached (keeps builds independent of the backend).
export function generateStaticParams() {
  return [];
}

type Params = Promise<{ lang: string; exp: string; sector: string }>;

async function load(params: Params) {
  const page = await resolvePage(params);
  const sector = sectorBySlug((await params).sector);
  if (!sector) notFound();
  return { ...page, sector, copy: page.dict.design.sectors[sector.space] };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang, dict, sector, copy } = await load(params);
  return {
    title: `${copy.title} · ${dict.design.eyebrow}`,
    description: copy.text,
    alternates: alternates(lang, `/design/${sector.slug}`),
  };
}

export default async function SectorPage({ params }: { params: Params }) {
  const { lang, dict, sector, copy } = await load(params);
  const districts = await listDistricts();
  const [hero, second] = sectorImages(sector.space);
  return (
    <>
      <DesignHero
        image={hero ?? ''}
        eyebrow={dict.design.eyebrow}
        title={copy.title}
        lead={`${copy.text} ${dict.design.lead}`}
        cta={dict.design.button}
        note={dict.landing.sampleNote}
      />
      <DesignProcess lang={lang} dict={dict} />
      <Included dict={dict} image={second ?? hero ?? ''} />
      <ConsultSection lang={lang} dict={dict} districts={districts} defaultSpace={sector.space} />
      <SectorGrid lang={lang} dict={dict} exclude={sector.space} />
    </>
  );
}
