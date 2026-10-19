'use client';

import * as A from '@radix-ui/react-accordion';
import { Plus } from 'lucide-react';
import { CopyText } from './copy-text';

/** Quiet accordion with hairline dividers (FAQ, product details). */
export function Accordion({
  items,
  defaultOpen,
}: {
  items: { id: string; title: string; body: React.ReactNode }[];
  defaultOpen?: string;
}) {
  return (
    <A.Root type="single" collapsible defaultValue={defaultOpen} className="border-t border-line">
      {items.map((item) => (
        <A.Item key={item.id} value={item.id} className="border-b border-line">
          <A.Header>
            <A.Trigger className="group flex w-full items-center justify-between gap-6 py-5 text-left">
              <span className="font-display text-xl font-light sm:text-2xl">{item.title}</span>
              <Plus
                aria-hidden
                strokeWidth={1.25}
                className="size-5 shrink-0 transition-transform duration-300 group-data-[state=open]:rotate-45"
              />
            </A.Trigger>
          </A.Header>
          <A.Content className="overflow-hidden data-[state=closed]:animate-[accordion-up_250ms_ease-out] data-[state=open]:animate-[accordion-down_300ms_var(--ease-out-soft)]">
            <div className="pb-6 pr-10 text-ink/80">
              {typeof item.body === 'string' ? <CopyText>{item.body}</CopyText> : item.body}
            </div>
          </A.Content>
        </A.Item>
      ))}
    </A.Root>
  );
}
