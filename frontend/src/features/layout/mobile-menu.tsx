'use client';

import Link from 'next/link';
import { Sheet } from '@/shared/ui/sheet';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setMenuOpen } from '@/store/slices/ui';

export function MobileMenu({
  title,
  closeLabel,
  links,
  footer,
}: {
  title: string;
  closeLabel: string;
  links: { href: string; label: string }[];
  footer: React.ReactNode;
}) {
  const dispatch = useAppDispatch();
  const open = useAppSelector((s) => s.ui.menuOpen);
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
      <nav>
        <ul className="space-y-1">
          {links.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                onClick={close}
                className="block py-2 font-display text-3xl font-light transition-opacity hover:opacity-60"
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </Sheet>
  );
}
