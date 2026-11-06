import type { Metadata } from 'next';
import { HelpLayout } from '@/features/help/help-layout';
import { PrivacyRequestForm } from '@/features/privacy/privacy-request-form';
import { PrivacyTrack } from '@/features/privacy/privacy-track';
import { resolvePage, type PageParams } from '@/shared/lib/page-params';
import { alternates } from '@/shared/lib/site';
import { PageHeader } from '@/shared/ui/page-header';

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: PageParams }): Promise<Metadata> {
  const { lang, dict } = await resolvePage(params);
  return {
    title: `${dict.privacyRequest.title} · ${dict.brand.name}`,
    description: dict.privacyRequest.intro,
    alternates: alternates(lang, '/privacy-request'),
  };
}

/** Privacy request form and status check (ADR 0020). */
export default async function PrivacyRequestPage({ params }: { params: PageParams }) {
  const { lang, dict } = await resolvePage(params);
  const copy = { privacyRequest: dict.privacyRequest, checkout: dict.checkout };
  return (
    <>
      <PageHeader eyebrow={dict.layout.columns.company} title={dict.privacyRequest.title} />
      <HelpLayout lang={lang} dict={dict} current="/privacy">
        <div className="space-y-14">
          <p className="text-[1.05rem] leading-relaxed">{dict.privacyRequest.intro}</p>
          <PrivacyRequestForm lang={lang} copy={copy} />
          <section className="space-y-6 border-t border-line pt-10">
            <h2 className="font-display text-2xl">{dict.privacyRequest.trackHeading}</h2>
            <PrivacyTrack lang={lang} copy={copy} />
          </section>
        </div>
      </HelpLayout>
    </>
  );
}
