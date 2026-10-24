'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Fragment, useEffect, useRef } from 'react';
import { cn } from '@/shared/lib/cn';
import { navLabel } from './header-styles';
import { isActivePath, type NavLink } from './nav';

/** 1px underline that draws from the left on hover and retracts to the right. */
const underline =
  'after:absolute after:inset-x-0 after:bottom-0 after:h-px after:origin-right after:bg-ink after:transition-transform after:duration-500 after:ease-out-soft hover:after:origin-left';

/**
 * Second header row: catalog categories, then the other shop pages. One 1px underline marks
 * the current section; on phones the strip scrolls sideways inside itself.
 */
export function NavTabs({ label, groups }: { label: string; groups: NavLink[][] }) {
  const pathname = usePathname();
  const strip = useRef<HTMLUListElement>(null);

  // Bring the current tab into view on phones without moving the page.
  useEffect(() => {
    const el = strip.current;
    const active = el?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!el || !active || el.scrollWidth <= el.clientWidth) return;
    el.scrollLeft = active.offsetLeft - (el.clientWidth - active.offsetWidth) / 2;
  }, [pathname]);

  return (
    <nav aria-label={label} className="relative border-t border-line/60">
      <ul
        ref={strip}
        className="scrollbar-none relative mx-auto flex max-w-[1440px] items-stretch gap-x-7 overflow-x-auto px-5 [mask-image:linear-gradient(to_right,transparent,#000_1.25rem,#000_calc(100%-2.5rem),transparent)] md:px-10 lg:justify-center-safe lg:gap-x-11 lg:[mask-image:none] xl:gap-x-14"
      >
        {groups.map((links, g) => (
          <Fragment key={g}>
            {g > 0 ? (
              <li aria-hidden className="flex shrink-0 items-center">
                <span className="h-3 w-px bg-line" />
              </li>
            ) : null}
            {links.map((l) => {
              const active = isActivePath(pathname, l.href);
              return (
                <li key={l.href} className="flex shrink-0">
                  <Link
                    href={l.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      navLabel,
                      underline,
                      'relative flex h-11 items-center whitespace-nowrap transition-colors duration-300 lg:h-[3.25rem]',
                      active
                        ? 'text-ink after:scale-x-100'
                        : 'text-ink/65 after:scale-x-0 hover:text-ink hover:after:scale-x-100',
                    )}
                  >
                    {l.label}
                  </Link>
                </li>
              );
            })}
          </Fragment>
        ))}
      </ul>
    </nav>
  );
}

/** A top-row text link that knows when its section is open. */
export function ActiveLink({ href, label }: NavLink) {
  const active = isActivePath(usePathname(), href);
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        navLabel,
        underline,
        'relative whitespace-nowrap py-1.5 transition-colors duration-300 lg:max-xl:tracking-[0.12em]',
        active
          ? 'text-ink after:scale-x-100'
          : 'text-ink/75 after:scale-x-0 hover:text-ink hover:after:scale-x-100',
      )}
    >
      {label}
    </Link>
  );
}
