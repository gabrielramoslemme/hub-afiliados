'use client';

import { Check, Copy } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/shared/lib/cn';

type CopyState = 'idle' | 'copied' | 'failed';

interface CopyCouponProps {
  code: string;
  className?: string;
}

const LABELS: Record<CopyState, string> = {
  idle: 'Copiar cupom',
  copied: 'Cupom copiado',
  failed: 'Não foi possível copiar. Selecione o código.',
};

/**
 * Copiar o cupom é a primeira coisa que um afiliado faz com ele. O botão existe
 * para isso e para nada mais — sem tooltip, sem menu, sem confirmação.
 *
 * `navigator.clipboard` só existe em contexto seguro: em HTTP simples ele é
 * `undefined` e a chamada estoura. Daí o estado `failed`, que devolve a
 * instrução em vez de falhar calado.
 */
export function CopyCoupon({ code, className }: CopyCouponProps) {
  const [state, setState] = useState<CopyState>('idle');
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  async function onCopy(): Promise<void> {
    clearTimeout(timer.current);

    try {
      await navigator.clipboard.writeText(code);
      setState('copied');
    } catch {
      setState('failed');
    }

    timer.current = setTimeout(() => setState('idle'), 2400);
  }

  const copied = state === 'copied';

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <button
        type="button"
        onClick={onCopy}
        aria-label={`Copiar o cupom ${code}`}
        className={cn(
          'group inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5',
          'transition-colors duration-150 active:translate-y-px',
          copied
            ? 'border-[var(--status-approved)]/30 bg-[var(--status-approved-surface)]'
            : 'border-ink-200 bg-white hover:border-blue-300 hover:bg-blue-50',
        )}
      >
        <span
          className="font-mono text-sm font-semibold tracking-[0.08em] text-ink-900"
          data-tabular
        >
          {code}
        </span>
        {copied ? (
          <Check className="size-3.5 text-[var(--status-approved)]" aria-hidden />
        ) : (
          <Copy
            className="size-3.5 text-ink-400 transition-colors group-hover:text-blue-600"
            aria-hidden
          />
        )}
      </button>

      {/* A confirmação precisa chegar a quem não vê o ícone trocar. */}
      <span
        role="status"
        aria-live="polite"
        className={cn(
          'text-[0.8125rem] transition-opacity duration-200',
          state === 'idle' && 'opacity-0',
          state === 'copied' && 'text-[var(--status-approved)]',
          state === 'failed' && 'text-destructive',
        )}
      >
        {state === 'idle' ? '' : LABELS[state]}
      </span>
    </div>
  );
}
