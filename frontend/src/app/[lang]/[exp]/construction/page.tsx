import type { Metadata } from 'next';
import { SAMPLE } from '@/content/sample-images';
import {
  BuildStages,
  BuildTypes,
  ConstructionHero,
  ConstructionProjects,
  StartSection,
  WhyOneTeam,
} from '@/features/construction/sections';
import { listDistricts } from '@/shared/api/server';
import { resolvePage, type PageParams } from '@/shared/lib/page-params';
import { alternates } from '@/shared/lib/site';

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: PageParams }): Promise<Metadata> {
  const { lang, dict } = await resolvePage(params);
  return {
    title: `${dict.construction.eyebrow} · ${dict.construction.heading}`,
    description: dict.construction.lead,
    alternates: alternates(lang, '/construction'),
  };
}

export default async function ConstructionPage({ params }: { params: PageParams }) {
  const { lang, dict } = await resolvePage(params);
  const districts = await listDistricts();
  return (
    <>
      <ConstructionHero lang={lang} dict={dict} image={SAMPLE.villa.src} />
      <BuildTypes
        lang={lang}
        dict={dict}
        images={{
          modernHouse: SAMPLE.modernHouse.src,
          woodFacade: SAMPLE.woodFacade.src,
          office: SAMPLE.office.src,
          cafeLights: SAMPLE.cafeLights.src,
        }}
      />
      <BuildStages
        lang={lang}
        dict={dict}
        images={[
          SAMPLE.plans.src,
          SAMPLE.engineers.src,
          SAMPLE.foundation.src,
          SAMPLE.structure.src,
          SAMPLE.dining.src,
          SAMPLE.livingNeutral.src,
        ]}
      />
      <WhyOneTeam lang={lang} dict={dict} image={SAMPLE.rebar.src} />
      <ConstructionProjects dict={dict} />
      <StartSection lang={lang} dict={dict} districts={districts} />
    </>
  );
}
