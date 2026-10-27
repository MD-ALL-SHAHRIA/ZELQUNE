import type { Metadata } from 'next';
import { SAMPLE } from '@/content/sample-images';
import { type Chapter, ConstructionJourney } from '@/features/construction/journey.client';
import { ThreadLine } from '@/features/construction/thread-line.client';
import {
  BuildTypes,
  ConstructionProjects,
  StartSection,
  WhyOneTeam,
} from '@/features/construction/sections';
import { getHomeContent } from '@/shared/api/content';
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
  const projects =
    (await getHomeContent())?.projects.filter((p) => p.kind === 'CONSTRUCTION') ?? [];
  const districts = await listDistricts();
  const d = dict.construction;
  // One scene per stage: from the drawing board to the keys.
  const stageImages = [
    SAMPLE.plans.src,
    SAMPLE.archModel.src,
    SAMPLE.structure.src,
    SAMPLE.modernHouse.src,
    SAMPLE.woodLounge.src,
    SAMPLE.villa.src,
  ];
  const chapters: Chapter[] = d.stages.map((stage, i) => ({
    title: stage.title,
    text: stage.text,
    image: stageImages[i % stageImages.length]!,
    // Alternate sides; the last chapters stay left, clear of the panel in the room.
    side: i % 2 && i < d.stages.length - 2 ? 'right' : 'left',
  }));
  return (
    <>
      <ConstructionJourney
        intro={{
          eyebrow: d.eyebrow,
          title: d.heading,
          text: d.lead,
          button: d.button,
          image: SAMPLE.duskHouse.src,
        }}
        chapters={chapters}
        room="/images/hero/moon-v2.webp"
        // A real fly-through: licensed Pexels footage (Pexels License), cut and graded into one
        // film; the scroll plays it. Without it the journey draws the building instead.
        video={{
          day: {
            src: '/videos/construction-journey-day.mp4',
            small: '/videos/construction-journey-day-720.mp4',
            poster: '/videos/construction-journey-day.jpg',
          },
          night: {
            src: '/videos/construction-journey-night.mp4',
            small: '/videos/construction-journey-night-720.mp4',
            poster: '/videos/construction-journey-night.jpg',
          },
        }}
        labels={{
          stage: d.journey.stage,
          scroll: d.journey.scroll,
          section: d.stagesHeading,
          approved: d.journey.approved,
        }}
        lang={lang}
      />
      {/* The roadmap thread runs on from the film through the rest of the page. */}
      <ThreadLine>
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
        <WhyOneTeam lang={lang} dict={dict} image={SAMPLE.rebar.src} />
        <ConstructionProjects dict={dict} lang={lang} projects={projects} />
        <StartSection lang={lang} dict={dict} districts={districts} />
      </ThreadLine>
    </>
  );
}
