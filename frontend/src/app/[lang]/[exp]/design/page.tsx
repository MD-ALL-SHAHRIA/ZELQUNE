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
  const districts = await listDistricts();
  return (
    <>
      <DesignHero
        image={SAMPLE.livingShelves.src}
        eyebrow={dict.design.eyebrow}
        title={dict.design.heading}
        lead={dict.design.lead}
        cta={dict.design.button}
        note={dict.landing.sampleNote}
      />
      <SectorGrid lang={lang} dict={dict} />
      <DesignProcess lang={lang} dict={dict} />
      <Included dict={dict} image={SAMPLE.dining.src} />
      <Projects dict={dict} />
      <ConsultSection lang={lang} dict={dict} districts={districts} />
    </>
  );
}
