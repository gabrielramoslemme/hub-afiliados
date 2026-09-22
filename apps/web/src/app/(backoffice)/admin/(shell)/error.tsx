'use client';

import { AlertTriangle, RotateCw } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';

/**
 * O que sobra depois que a sessão vencida já vira login na leitura: API fora do
 * ar, rede caída, defeito nosso. Em produção o Next não entrega a mensagem
 * original ao cliente — e ainda bem —, então a tela não tenta adivinhar a
 * causa: diz o que aconteceu, oferece tentar de novo e sai da frente.
 */
export default function AdminShellError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-panel border border-ink-200 bg-white px-6 py-20 text-center shadow-card">
      <span className="flex size-12 items-center justify-center rounded-full bg-[var(--status-pending-surface)]">
        <AlertTriangle className="size-6 text-[var(--status-pending)]" aria-hidden />
      </span>

      <div>
        <h1 className="font-semibold text-ink-900">Não foi possível carregar esta tela</h1>
        <p className="mx-auto mt-1.5 max-w-sm text-sm text-ink-500">
          A fila continua no lugar — o que falhou foi a busca dos dados. Tente de novo; se insistir,
          avise quem cuida do sistema.
        </p>
      </div>

      <Button onClick={reset} variant="outline" className="mt-2">
        <RotateCw aria-hidden />
        Tentar de novo
      </Button>
    </div>
  );
}
