'use client';

import * as AccordionPrimitive from '@radix-ui/react-accordion';
import { Plus } from 'lucide-react';
import type { ComponentProps } from 'react';
import { cn } from '@/shared/lib/cn';

export const Accordion = AccordionPrimitive.Root;

export function AccordionItem({
  className,
  ...props
}: ComponentProps<typeof AccordionPrimitive.Item>) {
  return (
    <AccordionPrimitive.Item className={cn('border-b border-ink-200', className)} {...props} />
  );
}

export function AccordionTrigger({
  className,
  children,
  ...props
}: ComponentProps<typeof AccordionPrimitive.Trigger>) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        className={cn(
          'group flex flex-1 items-start justify-between gap-6 py-5 text-left',
          'text-[1.0625rem] font-semibold tracking-[-0.01em] text-ink-900',
          'transition-colors hover:text-blue-600',
          className,
        )}
        {...props}
      >
        {children}
        <Plus
          className={cn(
            'mt-0.5 size-5 shrink-0 text-ink-400 transition-transform duration-200',
            'group-data-[state=open]:rotate-45',
          )}
        />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}

export function AccordionContent({
  className,
  children,
  ...props
}: ComponentProps<typeof AccordionPrimitive.Content>) {
  return (
    <AccordionPrimitive.Content
      className={cn(
        'overflow-hidden',
        'data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up',
      )}
      {...props}
    >
      <div className={cn('max-w-[62ch] pb-6 pr-10 text-ink-500 leading-relaxed', className)}>
        {children}
      </div>
    </AccordionPrimitive.Content>
  );
}
