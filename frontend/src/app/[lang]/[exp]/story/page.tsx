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
      <Container className="grid gap-12 py-20 lg:grid-cols-2 lg:gap-24">
        <Picture src={SAMPLE.pampas.src} alt="" sizes="(min-width: 1024px) 45vw, 100vw" arch />
        <div className="flex flex-col justify-center gap-6 text-lg leading-relaxed">
          <p className="font-display text-3xl font-light leading-snug">
            {dict.brand.seoDescription}
          </p>
          <p>
            <CopyText>{dict.story.text}</CopyText>
          </p>
        </div>
      </Container>
      <Craft dict={dict} lang={lang} />
    </>
  );
}
