'use client';

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
  /** Large display links for the shop, small text links for help pages. */
  size: 'lg' | 'md' | 'sm';
}

export interface MenuProps {
  title: string;
  closeLabel: string;
  sections: MenuSection[];
  footer: React.ReactNode;
}

const sizes: Record<MenuSection['size'], string> = {
  lg: 'py-1.5 font-display text-[2rem] font-light leading-tight [:lang(bn)_&]:text-[1.6rem]',
  md: 'py-1.5 font-display text-2xl font-light leading-tight [:lang(bn)_&]:text-xl',
  sm: 'py-1.5 text-[0.95rem] text-ink/80',
};

export function MobileMenu({ title, closeLabel, sections, footer }: MenuProps) {
  const dispatch = useAppDispatch();
  const open = useAppSelector((s) => s.ui.menuOpen);
  const pathname = usePathname();
  const close = () => dispatch(setMenuOpen(false));
  return (
    <Sheet
      open={open}
      onOpenChange={(v) => dispatch(setMenuOpen(v))}
      title={title}
      closeLabel={closeLabel}
      side="left"
      footer={footer}
    >
      <nav aria-label={title} className="divide-y divide-line">
        {sections.map((section, i) => (
          <div key={section.title ?? i} className="py-6 first:pt-0 last:pb-0">
            {section.title ? (
              <p className={cn(navLabel, 'mb-3 text-stone')}>{section.title}</p>
            ) : null}
            <ul>
              {section.links.map((l) => {
                const active = isActivePath(pathname, l.href);
                return (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      onClick={close}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'group flex items-center gap-3 transition-opacity hover:opacity-60',
                        sizes[section.size],
                      )}
                    >
                      {l.label}
                      {active ? (
                        <span aria-hidden className="size-1.5 rounded-full bg-amber" />
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
