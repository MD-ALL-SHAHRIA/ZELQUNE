import {
  BarChart3,
  Boxes,
  FileSignature,
  FileText,
  FolderTree,
  History,
  House,
  Landmark,
  Package,
  Receipt,
  Settings,
  ShoppingBag,
  Ticket,
  Users,
  Zap,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  keywords?: string;
  /** Shown only to the owner (finance, audit). */
  ownerOnly?: boolean;
}

export const NAV_GROUPS: { label?: string; items: NavItem[] }[] = [
  {
    items: [
      { href: '/', label: 'Home', icon: House, keywords: 'overview dashboard go counter today' },
      {
        href: '/analytics',
        label: 'Analytics',
        icon: BarChart3,
        keywords: 'reports sales best sellers districts funnel conversion',
      },
    ],
  },
  {
    label: 'Sales',
    items: [
      { href: '/orders', label: 'Orders', icon: ShoppingBag, keywords: 'payments verify ship' },
      {
        href: '/quotes',
        label: 'Quotes',
        icon: FileSignature,
        keywords: 'b2b bulk corporate rfq interior design construction leads',
      },
      { href: '/customers', label: 'Customers', icon: Users, keywords: 'people buyers phone' },
    ],
  },
  {
    label: 'Catalog',
    items: [
      {
        href: '/products',
        label: 'Products',
        icon: Package,
        keywords: 'photos publish price cost',
      },
      { href: '/categories', label: 'Categories', icon: FolderTree, keywords: 'collections menu' },
      { href: '/inventory', label: 'Inventory', icon: Boxes, keywords: 'stock sku restock' },
    ],
  },
  {
    label: 'Marketing',
    items: [
      {
        href: '/marketing/sales',
        label: 'Flash sales',
        icon: Zap,
        keywords: 'discount promotion sale offer eid festival countdown',
      },
      {
        href: '/marketing/coupons',
        label: 'Coupons',
        icon: Ticket,
        keywords: 'discount code promo',
      },
    ],
  },
  {
    label: 'Finance',
    items: [
      {
        href: '/finance',
        label: 'Profit and loss',
        icon: Landmark,
        keywords: 'p&l profit loss margin revenue cost',
        ownerOnly: true,
      },
      {
        href: '/finance/expenses',
        label: 'Expenses',
        icon: Receipt,
        keywords: 'costs spending bills rent salary ads',
        ownerOnly: true,
      },
    ],
  },
  {
    label: 'Online store',
    items: [
      {
        href: '/content',
        label: 'Website content',
        icon: FileText,
        keywords:
          'home page hero banner trust collections contact announcement projects portfolio clients logos partners privacy terms faq story policies',
      },
      {
        href: '/audit',
        label: 'Audit log',
        icon: History,
        keywords: 'history who changed activity',
        ownerOnly: true,
      },
    ],
  },
  {
    items: [
      {
        href: '/settings',
        label: 'Settings',
        icon: Settings,
        keywords: 'payments bkash nagad advance shipping delivery fee team staff password account',
      },
    ],
  },
];

export const NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items);
