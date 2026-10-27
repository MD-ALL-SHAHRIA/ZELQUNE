import { ArrowRight, Package, ReceiptText } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { resolvePage, type PageParams } from '@/shared/lib/page-params';
import { alternates, href } from '@/shared/lib/site';
import { PageHeader } from '@/shared/ui/page-header';
import { Container } from '@/shared/ui/typography';

export const revalidate = 300;

export async function generateMetadata({ params }: { params: PageParams }): Promise<Metadata> {
  const { lang, dict } = await resolvePage(params);
  return {
    title: `${dict.account.heading} · ${dict.brand.name}`,
    alternates: alternates(lang, '/account'),
    robots: { index: false },
  };
}

/** No customer login before M2: the account page points to code + phone lookups instead. */
export default async function AccountPage({ params }: { params: PageParams }) {
  const { lang, dict } = await resolvePage(params);
  const actions = [
    { href: href(lang, '/track'), label: dict.account.trackOrder, Icon: Package },
    { href: href(lang, '/bulk/track'), label: dict.account.checkQuote, Icon: ReceiptText },
  ];
  return (
    <>
      <PageHeader
        eyebrow={dict.header.account}
        title={dict.account.heading}
        lead={dict.account.text}
      />
      <Container className="py-16 sm:py-20">
        <ul className="grid gap-px border border-line bg-line sm:grid-cols-2">
          {actions.map(({ href: target, label, Icon }) => (
            <li key={target} className="flex">
              <Link
                href={target}
                className="group flex min-h-40 w-full flex-col justify-between gap-10 bg-paper p-8 transition-colors duration-500 ease-out-soft hover:bg-cream sm:min-h-64 sm:p-10"
              >
                <Icon aria-hidden className="size-6 text-walnut" strokeWidth={1.1} />
                <span className="flex items-end justify-between gap-6">
                  <span className="font-display text-3xl font-medium leading-tight sm:text-4xl [:lang(bn)_&]:text-2xl sm:[:lang(bn)_&]:text-3xl">
                    {label}
                  </span>
                  <ArrowRight
                    aria-hidden
                    className="mb-2 size-5 shrink-0 transition-transform duration-500 ease-out-soft group-hover:translate-x-1.5"
                    strokeWidth={1.1}
                  />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </>
  );
}
