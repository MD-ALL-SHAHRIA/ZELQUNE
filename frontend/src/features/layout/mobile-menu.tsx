'use client';

import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/shared/lib/cn';
import { Sheet } from '@/shared/ui/sheet';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setMenuOpen } from '@/store/slices/ui';
import { navLabel } from './header-styles';
import { isActivePath, type NavLink } from './nav';

export interface MenuSection {
  title?: string;
  links: NavLink[];
  /** Large display links for the shop, medium for services, small text links for help pages. */
  size: 'lg' | 'md' | 'sm';
}

export interface MenuProps {
  title: string;
  closeLabel: string;
  sections: MenuSection[];
  footer: React.ReactNode;
}

const sizes: Record<MenuSection['size'], string> = {
  lg: 'py-[0.4rem] font-display text-[2.35rem] font-medium leading-[1.08] tracking-[-0.01em] [:lang(bn)_&]:py-1 [:lang(bn)_&]:text-[1.75rem] [:lang(bn)_&]:font-normal [:lang(bn)_&]:leading-snug',
  md: 'py-[0.35rem] font-display text-[1.65rem] font-medium leading-tight [:lang(bn)_&]:text-[1.3rem] [:lang(bn)_&]:font-normal',
  sm: 'py-1.5 text-[0.92rem] text-ink/75 hover:text-ink',
};

/** Staggered entrance, CSS only (reduced motion: instant, see globals.css). */
const enter = 'animate-[fade-up_550ms_var(--ease-out-soft)_both]';

export function MobileMenu({ title, closeLabel, sections, footer }: MenuProps) {
  const dispatch = useAppDispatch();
  const open = useAppSelector((s) => s.ui.menuOpen);
  const pathname = usePathname();
  const close = () => dispatch(setMenuOpen(false));
  // Running link index across sections, for the entrance stagger.
  const starts = sections.map((_, i) =>
    sections.slice(0, i).reduce((sum, sec) => sum + sec.links.length, 0),
  );
  return (
    <Sheet
      open={open}
      onOpenChange={(v) => dispatch(setMenuOpen(v))}
      title={title}
      closeLabel={closeLabel}
      side="left"
      footer={footer}
    >
      <nav aria-label={title}>
        {sections.map((section, i) => (
          <div
            key={section.title ?? i}
            className={cn(
              'py-7 first:pt-1 last:pb-0',
              section.size === 'md' && '-mx-6 my-1 bg-cream px-6 sm:-mx-8 sm:px-8',
            )}
          >
            {section.title ? (
              <p className={cn(navLabel, 'mb-4 flex items-center gap-3 text-stone')}>
                <span aria-hidden className="h-px w-6 bg-current opacity-50" />
                {section.title}
              </p>
            ) : null}
            <ul className={cn(section.size === 'sm' && 'grid grid-cols-2 gap-x-6')}>
              {section.links.map((l, j) => {
                const active = isActivePath(pathname, l.href);
                const delay = `${Math.min((starts[i] ?? 0) + j, 10) * 30 + 100}ms`;
                return (
                  <li key={l.href} className={enter} style={{ animationDelay: delay }}>
                    <Link
                      href={l.href}
                      onClick={close}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'group flex items-center gap-3 transition-[color,opacity] duration-300',
                        section.size !== 'sm' && 'hover:text-walnut',
                        sizes[section.size],
                      )}
                    >
                      <span>{l.label}</span>
                      {active ? (
                        <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-amber" />
                      ) : null}
                      {section.size !== 'sm' ? (
                        <ArrowRight
                          aria-hidden
                          strokeWidth={1}
                          className="ml-auto size-5 shrink-0 -translate-x-2 opacity-0 transition-[opacity,transform] duration-500 ease-out-soft group-hover:translate-x-0 group-hover:opacity-60"
                        />
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </Sheet>
  );
}
