import type { ComponentProps } from 'react';
import { cn } from '@/core/cn';

export function Input({ className, type, ...props }: ComponentProps<'input'>) {
  return (
    <input
      type={type}
      className={cn(
        'flex h-11 w-full rounded-md border border-input bg-background px-3.5 py-2',
        'text-[0.9375rem] text-foreground placeholder:text-ink-400',
        // `box-shadow` na lista porque o anel de foco é sombra: sem ele o anel
        // aparece de uma vez enquanto a borda transiciona, e os dois destoam.
        'transition-[color,background-color,border-color,box-shadow] duration-150',
        'hover:border-ink-400 focus-visible:border-ring focus-visible:outline-none',
        'focus-visible:ring-[3px] focus-visible:ring-blue-600/15',
        'disabled:cursor-not-allowed disabled:bg-ink-50 disabled:text-ink-400',
        'aria-invalid:border-destructive aria-invalid:ring-destructive/15',
        className,
      )}
      {...props}
    />
  );
}
