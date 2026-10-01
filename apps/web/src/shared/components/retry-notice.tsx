'use client';

import { Clock } from 'lucide-react';
import { formatWait } from '@/shared/lib/retry-after';

/**
 * O aviso de que as tentativas acabaram por ora, com a contagem até a próxima.
 * Só aparece durante a espera; o formulário trava o botão pelo mesmo número.
 */
export function RetryNotice({ remaining }: { remaining: number }) {
  if (remaining <= 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="animate-alert flex items-start gap-3 rounded-md border border-destructive/30 bg-red-50 px-4 py-3"
    >
      <Clock className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
      <p className="text-sm font-medium text-destructive">
        Muitas tentativas seguidas. Por segurança, tente de novo em{' '}
        <span data-tabular>{formatWait(remaining)}</span>.
      </p>
    </div>
  );
}
