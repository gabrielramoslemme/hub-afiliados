'use client';

import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';
import { cn } from '@/shared/lib/cn';

export const DropdownMenu = DropdownMenuPrimitive.Root;
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;

export function DropdownMenuContent({
  className,
  sideOffset = 6,
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        sideOffset={sideOffset}
        className={cn(
          'z-50 min-w-[11rem] origin-top overflow-hidden rounded-md border border-ink-200',
          'bg-popover p-1 text-popover-foreground shadow-pop',
          'data-[state=open]:animate-pop-in data-[state=closed]:animate-pop-out',
          className,
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
}

const itemVariants = cva(
  cn(
    'relative flex cursor-default select-none items-center gap-2 rounded-sm px-3 py-2',
    'text-sm outline-none transition-colors data-[disabled]:opacity-50 [&_svg]:size-4',
  ),
  {
    variants: {
      /*
        O tom vem dos mesmos tokens de status do `Badge`: aprovar e reprovar são
        a mesma semântica em outro lugar da tela, e dois verdes diferentes no
        mesmo painel é como uma paleta começa a escorrer.
      */
      tone: {
        default: 'data-[highlighted]:bg-ink-100 [&_svg]:text-ink-400',
        positive: cn(
          'text-[var(--status-approved)] [&_svg]:text-[var(--status-approved)]',
          'data-[highlighted]:bg-[var(--status-approved-surface)]',
        ),
        destructive: cn(
          'text-[var(--status-rejected)] [&_svg]:text-[var(--status-rejected)]',
          'data-[highlighted]:bg-[var(--status-rejected-surface)]',
        ),
      },
    },
    defaultVariants: { tone: 'default' },
  },
);

type DropdownMenuItemProps = ComponentProps<typeof DropdownMenuPrimitive.Item> &
  VariantProps<typeof itemVariants>;

export function DropdownMenuItem({ className, tone, ...props }: DropdownMenuItemProps) {
  return (
    <DropdownMenuPrimitive.Item className={cn(itemVariants({ tone }), className)} {...props} />
  );
}

export function DropdownMenuSeparator({
  className,
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
  return (
    <DropdownMenuPrimitive.Separator
      className={cn('-mx-1 my-1 h-px bg-ink-200', className)}
      {...props}
    />
  );
}
