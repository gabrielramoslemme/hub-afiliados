import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';
import { cn } from '@/shared/lib/cn';

const badgeVariants = cva(
  cn(
    'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1',
    'text-xs font-semibold whitespace-nowrap',
  ),
  {
    variants: {
      tone: {
        neutral: 'bg-ink-100 text-ink-700',
        brand: 'bg-blue-50 text-blue-700',
        pending: 'bg-[var(--status-pending-surface)] text-[var(--status-pending)]',
        approved: 'bg-[var(--status-approved-surface)] text-[var(--status-approved)]',
        rejected: 'bg-[var(--status-rejected-surface)] text-[var(--status-rejected)]',
        suspended: 'bg-[var(--status-suspended-surface)] text-[var(--status-suspended)]',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
);

type BadgeProps = ComponentProps<'span'> & VariantProps<typeof badgeVariants>;

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
