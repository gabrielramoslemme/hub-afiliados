'use client';

import { AlertTriangle, RotateCw } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';

/** O par do erro do painel, com a copy virada para quem lê do outro lado. */
export default function AffiliateAreaError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-6 py-20 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-[var(--status-pending-surface)]">
        <AlertTriangle className="size-6 text-[var(--status-pending)]" aria-hidden />
      </span>

      <div>
        <h1 className="font-semibold text-ink-900">Não foi possível carregar sua área agora</h1>
        <p className="mt-1.5 text-sm text-ink-500">
          Seus dados estão a salvo — o que falhou foi a busca deles. Tente de novo em instantes.
        </p>
      </div>

      <Button onClick={reset} variant="outline" className="mt-2">
        <RotateCw aria-hidden />
        Tentar de novo
      </Button>
    </div>
  );
}
