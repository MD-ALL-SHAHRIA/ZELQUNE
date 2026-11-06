import type { Metadata } from 'next';
import { CookieSettingsButton } from '@/features/consent/cookie-banner';
import { HelpLayout } from '@/features/help/help-layout';
import { resolvePage, type PageParams } from '@/shared/lib/page-params';
import { alternates } from '@/shared/lib/site';
import { PageHeader } from '@/shared/ui/page-header';

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: PageParams }): Promise<Metadata> {
  const { lang, dict } = await resolvePage(params);
  return {
    title: `${dict.cookies.title} · ${dict.brand.name}`,
    description: dict.cookies.intro,
    alternates: alternates(lang, '/cookies'),
  };
}

/** Cookie Policy: what the site stores, why, for how long, and how to change the choice. */
export default async function CookiesPage({ params }: { params: PageParams }) {
  const { lang, dict } = await resolvePage(params);
  const c = dict.cookies;
  return (
    <>
      <PageHeader eyebrow={dict.layout.columns.company} title={c.title} />
      <HelpLayout lang={lang} dict={dict} current="/cookies">
        <div className="max-w-3xl space-y-10 text-[1rem] leading-relaxed">
          <p className="text-[0.85rem] text-stone">{c.updated}</p>
          <p>{c.intro}</p>
          <section className="space-y-3">
            <h2 className="font-display text-2xl">{c.whatHeading}</h2>
            <p>{c.what}</p>
          </section>
          <section className="space-y-4">
            <h2 className="font-display text-2xl">{c.tableHeading}</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[40rem] border-collapse text-left text-[0.9rem]">
                <thead>
                  <tr className="border-b border-line">
                    {c.columns.map((h) => (
                      <th key={h} scope="col" className="py-3 pr-4 font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {c.rows.map(([name, type, by, why, how]) => (
                    <tr key={name} className="border-b border-line align-top">
                      <th scope="row" className="py-3 pr-4 font-mono text-[0.82rem] font-normal">
                        {name}
                      </th>
                      <td className="py-3 pr-4">{type}</td>
                      <td className="py-3 pr-4">{by}</td>
                      <td className="py-3 pr-4">{why}</td>
                      <td className="py-3">{how}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <section className="space-y-3">
            <h2 className="font-display text-2xl">{c.changeHeading}</h2>
            <p>{c.change}</p>
            <p className="font-medium underline underline-offset-4">
              <CookieSettingsButton label={dict.consent.settings} />
            </p>
          </section>
          <section className="space-y-3">
            <h2 className="font-display text-2xl">{c.thirdHeading}</h2>
            <p>{c.third}</p>
          </section>
        </div>
      </HelpLayout>
    </>
  );
}
