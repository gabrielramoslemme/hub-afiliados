import type { ComponentProps } from 'react';
import { cn } from '@/core/cn';

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return (
    <textarea
      className={cn(
        'flex min-h-24 w-full rounded-md border border-input bg-background px-3.5 py-2.5',
        'text-[0.9375rem] leading-relaxed text-foreground transition-colors',
        'placeholder:text-ink-400 hover:border-ink-400 focus-visible:border-ring',
        'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-blue-600/15',
        'aria-invalid:border-destructive aria-invalid:ring-destructive/15',
        className,
      )}
      {...props}
    />
  );
}
