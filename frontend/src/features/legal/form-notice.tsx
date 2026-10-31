import Link from 'next/link';
import { type Locale } from '@/i18n/config';
import { cn } from '@/shared/lib/cn';
import { href } from '@/shared/lib/site';

/** One line beside a form's submit button: what the details are used for, and the policy. */
export function FormNotice({
  lang,
  text,
  link,
  className,
}: {
  lang: Locale;
  text: string;
  link: string;
  className?: string;
}) {
  return (
    <p className={cn('text-[0.82rem] leading-relaxed text-stone', className)}>
      {text}{' '}
      <Link href={href(lang, '/privacy')} className="text-ink underline underline-offset-4">
        {link}
      </Link>
    </p>
  );
}
