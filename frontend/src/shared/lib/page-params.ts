import 'server-only';
import { notFound } from 'next/navigation';
import { isLocale, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n';
import { getHomeContent, withContent } from '@/shared/api/content';
import { isPriceSegment, type PriceSegment } from './visitor';

export type PageParams = Promise<{ lang: string; exp: string }>;

export async function resolvePage(params: PageParams): Promise<{
  lang: Locale;
  segment: PriceSegment;
  dict: ReturnType<typeof getDictionary>;
}> {
  const { lang, exp } = await params;
  if (!isLocale(lang) || !isPriceSegment(exp)) notFound();
  // The owner's texts from the dashboard (cached, so the layout and the page share one request).
  const content = await getHomeContent();
  return { lang, segment: exp, dict: withContent(getDictionary(lang), content, lang) };
}
