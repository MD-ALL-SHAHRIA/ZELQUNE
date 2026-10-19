import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LogoMark } from '@/shared/ui/logo';
import { ORDER_CODE } from '@/shared/lib/forms';
import { resolvePage } from '@/shared/lib/page-params';
import { href } from '@/shared/lib/site';
import { ButtonLink } from '@/shared/ui/button';
import { Container, Heading } from '@/shared/ui/typography';

type Params = Promise<{ lang: string; exp: string; code: string }>;

export const metadata: Metadata = { robots: { index: false } };

/** Order placed. Shows only the code from the URL: no personal data on this page. */
export default async function OrderPlaced({ params }: { params: Params }) {
  const { lang, dict } = await resolvePage(params);
  const { code } = await params;
  if (!ORDER_CODE.test(code)) notFound();
  const [before, after] = dict.success.text.split('{code}');
  return (
    <section className="glow">
      <Container className="mx-auto flex max-w-3xl flex-col items-center gap-8 py-24 text-center sm:py-32">
        <LogoMark className="h-14 text-walnut" />
        <Heading as="h1" level="h1">
          {dict.success.heading}
        </Heading>
        <p className="max-w-xl text-lg leading-relaxed">
          {before}
          <strong
            data-testid="order-code"
            className="mx-1 inline-block border border-ink px-3 py-1 font-mono text-base tracking-[0.18em]"
          >
            {code}
          </strong>
          {after}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <ButtonLink href={`${href(lang, '/track')}?code=${code}`} size="lg">
            {dict.success.track}
          </ButtonLink>
          <ButtonLink href={href(lang, '/shop')} variant="outline" size="lg">
            {dict.success.keepBrowsing}
          </ButtonLink>
        </div>
      </Container>
    </section>
  );
}
