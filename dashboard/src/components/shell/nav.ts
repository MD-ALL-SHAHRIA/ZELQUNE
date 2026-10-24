import { FileText, House, Package, ShoppingBag, type LucideIcon } from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  keywords?: string;
}

export const NAV_GROUPS: { label?: string; items: NavItem[] }[] = [
  { items: [{ href: '/', label: 'Home', icon: House, keywords: 'overview dashboard go counter' }] },
  {
    label: 'Sales',
    items: [
      { href: '/orders', label: 'Orders', icon: ShoppingBag, keywords: 'payments verify ship' },
    ],
  },
  {
    label: 'Catalog',
    items: [{ href: '/products', label: 'Products', icon: Package, keywords: 'photos publish' }],
  },
  {
    label: 'Online store',
    items: [
      {
        href: '/content',
        label: 'Home page',
        icon: FileText,
        keywords: 'hero banner trust collections contact',
      },
    ],
  },
];

export const NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items);
