'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

/** Side drawer (cart, mobile menu) on Radix Dialog: focus trap, Esc, scroll lock, a11y. */
export function Sheet({
  open,
  onOpenChange,
  title,
  closeLabel,
  side = 'right',
  footer,
  children,
}: {
  open: boolean;
  onOpenChange(open: boolean): void;
  title: string;
  closeLabel: string;
  side?: 'left' | 'right';
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-[3px] data-[state=open]:animate-[fade-in_400ms_ease-out]" />
        <Dialog.Content
          aria-describedby={undefined}
          className={cn(
            'fixed inset-y-0 z-50 flex w-full max-w-[28rem] flex-col bg-paper bg-[image:var(--grain)] shadow-[0_0_80px_rgba(43,30,25,0.22)]',
            side === 'right'
              ? 'right-0 data-[state=open]:animate-[slide-in-right_420ms_var(--ease-out-soft)]'
              : 'left-0 data-[state=open]:animate-[slide-in-left_420ms_var(--ease-out-soft)]',
          )}
        >
          <div className="flex items-center justify-between border-b border-line px-6 py-5 sm:px-8">
            <Dialog.Title className="font-display text-[1.7rem] font-light leading-none [:lang(bn)_&]:font-normal">
              {title}
            </Dialog.Title>
            <Dialog.Close
              aria-label={closeLabel}
              className="-mr-2 grid size-10 place-items-center text-ink transition-transform duration-500 ease-out-soft hover:rotate-90"
            >
              <X className="size-5" strokeWidth={1.25} />
            </Dialog.Close>
          </div>
          <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-6 sm:px-8">
            {children}
          </div>
          {footer ? <div className="border-t border-line px-6 py-6 sm:px-8">{footer}</div> : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
