'use client';

import { Toaster as Sonner } from 'sonner';

/**
 * O toast herda os tokens do design system em vez do tema próprio do sonner —
 * senão a única superfície da aplicação com outra paleta seria justamente a que
 * aparece por cima de tudo.
 */
export function Toaster() {
  return (
    <Sonner
      position="top-center"
      toastOptions={{
        classNames: {
          toast: 'rounded-md border border-ink-200 bg-background text-ink-900 shadow-pop',
          description: 'text-ink-500',
          actionButton: 'bg-primary text-primary-foreground',
          error: 'border-destructive/30',
          success: 'border-[var(--status-approved)]/30',
        },
      }}
    />
  );
}
