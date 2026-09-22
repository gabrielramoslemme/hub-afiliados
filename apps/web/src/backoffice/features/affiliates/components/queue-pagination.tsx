import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/shared/components/ui/button';
import { PAGE_SIZE, type QueueParams, queueHref } from '../lib/queue-params';

interface QueuePaginationProps {
  params: QueueParams;
  total: number;
}

export function QueuePagination({ params, total }: QueuePaginationProps) {
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total === 0 ? 0 : (params.page - 1) * PAGE_SIZE + 1;
  const to = Math.min(params.page * PAGE_SIZE, total);

  return (
    <div className="flex items-center justify-between border-t border-ink-200 px-4 py-3">
      <p className="text-sm text-ink-500" data-tabular>
        {from}–{to} de {total}
      </p>

      <div className="flex items-center gap-2">
        {/*
          Link quando navega, botão desabilitado quando não. Envolver o conteúdo
          num `span` só para manter o `asChild` quebra o layout do botão: o
          `span` vira um filho de bloco e o ícone cai para outra linha.
        */}
        {params.page > 1 ? (
          <Button asChild variant="outline" size="sm">
            <Link href={queueHref(params, { page: params.page - 1 })}>
              <ChevronLeft aria-hidden />
              Anterior
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            <ChevronLeft aria-hidden />
            Anterior
          </Button>
        )}

        <span className="px-1 text-sm text-ink-500" data-tabular>
          {params.page} de {lastPage}
        </span>

        {params.page < lastPage ? (
          <Button asChild variant="outline" size="sm">
            <Link href={queueHref(params, { page: params.page + 1 })}>
              Próxima
              <ChevronRight aria-hidden />
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            Próxima
            <ChevronRight aria-hidden />
          </Button>
        )}
      </div>
    </div>
  );
}
