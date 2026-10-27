import type { Metadata } from 'next';
import { SAMPLE } from '@/content/sample-images';
import {
  ConsultSection,
  DesignHero,
  DesignProcess,
  Included,
  Projects,
  SectorGrid,
} from '@/features/design/sections';
import { getHomeContent } from '@/shared/api/content';
import { listDistricts } from '@/shared/api/server';
import { resolvePage, type PageParams } from '@/shared/lib/page-params';
import { alternates } from '@/shared/lib/site';

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: PageParams }): Promise<Metadata> {
  const { lang, dict } = await resolvePage(params);
  return {
    title: `${dict.design.eyebrow} · ${dict.design.heading}`,
    description: dict.design.lead,
    alternates: alternates(lang, '/design'),
  };
}

export default async function DesignPage({ params }: { params: PageParams }) {
  const { lang, dict } = await resolvePage(params);
  const projects = (await getHomeContent())?.projects.filter((p) => p.kind === 'DESIGN') ?? [];
  const districts = await listDistricts();
  return (
    <>
      <DesignHero
        lang={lang}
        dict={dict}
        image={SAMPLE.livingShelves.src}
        title={dict.design.heading}
        lead={dict.design.lead}
      />
      <SectorGrid lang={lang} dict={dict} />
      <DesignProcess lang={lang} dict={dict} />
      <Included lang={lang} dict={dict} image={SAMPLE.dining.src} />
      <Projects dict={dict} lang={lang} projects={projects} />
      <ConsultSection lang={lang} dict={dict} districts={districts} />
    </>
  );
}
