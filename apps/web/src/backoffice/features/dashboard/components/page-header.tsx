import { ClipboardCheck } from 'lucide-react';
import Link from 'next/link';
import { AffiliateStatusEnum } from '@porto/contracts';
import { QUEUE_PATH } from '@/backoffice/shared/routes';
import { Button } from '@/shared/components/ui/button';
import { attention, currentPeriod } from '../lib/mock-data';

/**
 * O topo da tela responde três coisas antes de qualquer número: onde estou, de
 * que período é isto e o que a Porto precisa que eu faça agora. A ação fica
 * aqui, e não perdida no meio dos cartões, porque avaliar cadastro é a única
 * coisa que a analista pode fazer a partir desta tela.
 */
export function DashboardHeader() {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-ink-200 pb-6">
      <div>
        <h1 className="text-2xl font-bold tracking-[-0.02em] text-ink-900">Dashboard</h1>
        <p className="mt-1.5 text-[0.9375rem] text-ink-500">
          Visão geral do programa · {currentPeriod}
        </p>
      </div>

      <Button asChild>
        <Link
          href={`${QUEUE_PATH}?status=${AffiliateStatusEnum.PENDING_APPROVAL}`}
          aria-label={`Revisar ${attention.pendingReviews} cadastros aguardando avaliação`}
        >
          <ClipboardCheck aria-hidden />
          Revisar {attention.pendingReviews} cadastros
        </Link>
      </Button>
    </header>
  );
}
