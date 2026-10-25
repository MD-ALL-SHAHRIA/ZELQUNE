import type { Metadata } from 'next';
import { SAMPLE } from '@/content/sample-images';
import { Craft } from '@/features/landing/craft';
import { resolvePage, type PageParams } from '@/shared/lib/page-params';
import { alternates } from '@/shared/lib/site';
import { CopyText } from '@/shared/ui/copy-text';
import { Picture } from '@/shared/ui/image';
import { PageHeader } from '@/shared/ui/page-header';
import { Container } from '@/shared/ui/typography';

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: PageParams }): Promise<Metadata> {
  const { lang, dict } = await resolvePage(params);
  return {
    title: `${dict.story.title} · ${dict.brand.name}`,
    description: dict.brand.seoDescription,
    alternates: alternates(lang, '/story'),
  };
}

export default async function StoryPage({ params }: { params: PageParams }) {
  const { lang, dict } = await resolvePage(params);
  return (
    <>
      <PageHeader eyebrow={dict.brand.name} title={dict.story.title} lead={dict.brand.tagline} />
      <Container className="grid items-center gap-14 py-20 sm:py-28 lg:grid-cols-[1fr_1.1fr] lg:gap-24">
        <Picture
          src={SAMPLE.pampas.src}
          alt=""
          sizes="(min-width: 1024px) 42vw, 100vw"
          arch
          note={dict.landing.sampleNote}
          className="mx-auto w-full max-w-md lg:max-w-none"
        />
        <div className="space-y-10">
          <span aria-hidden className="block h-px w-14 bg-amber" />
          <p className="font-display text-[2.1rem] font-medium leading-[1.12] text-balance sm:text-[2.6rem] [:lang(bn)_&]:text-[1.7rem] [:lang(bn)_&]:leading-snug sm:[:lang(bn)_&]:text-[2rem]">
            {dict.brand.seoDescription}
          </p>
          <div className="border-t border-line pt-8 text-[1.05rem] leading-relaxed text-ink/85">
            <p>
              <CopyText>{dict.story.text}</CopyText>
            </p>
          </div>
        </div>
      </Container>
      <Craft dict={dict} lang={lang} />
    </>
  );
}
