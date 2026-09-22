import Link from 'next/link';
import {
  type AffiliateReferralsResponse,
  ReferralPeriodEnum,
  ReferralStatusEnum,
} from '@porto/contracts';
import { Badge } from '@/shared/components/ui/badge';
import { cn } from '@/shared/lib/cn';
import { formatBRL, formatDate, formatDateTime } from '@/shared/lib/format';
import { referralPeriodHref } from '../lib/referral-period';

const PERIODS: { period: ReferralPeriodEnum; tab: string; caption: string }[] = [
  { period: ReferralPeriodEnum.LAST_30_DAYS, tab: '30 dias', caption: 'Últimos 30 dias' },
  { period: ReferralPeriodEnum.YEAR, tab: 'Ano', caption: 'Este ano' },
  { period: ReferralPeriodEnum.ALL, tab: 'Tudo', caption: 'Desde o início' },
];

const STATUS: Record<ReferralStatusEnum, { label: string; tone: 'approved' | 'pending' }> = {
  [ReferralStatusEnum.COMPLETED]: { label: 'Realizado', tone: 'approved' },
  [ReferralStatusEnum.PENDING]: { label: 'Pendente', tone: 'pending' },
};

interface ReferralListProps {
  referrals: AffiliateReferralsResponse;
  period: ReferralPeriodEnum;
  className?: string;
}

export function ReferralList({ referrals, period, className }: ReferralListProps) {
  const caption = PERIODS.find((item) => item.period === period)?.caption;

  return (
    <section className={cn('rounded-panel border border-ink-200 bg-white p-6', className)}>
      <h2 className="font-semibold text-ink-900">Últimas indicações</h2>
      <p className="mt-1 text-[0.8125rem] text-ink-500">
        {caption} · atualizado em {formatDateTime(referrals.updatedAt)}
      </p>

      {/*
        Link e não botão: o período mora na URL, como os filtros da fila do
        painel. `scroll={false}` porque trocar de aba não é trocar de página.
      */}
      <nav
        aria-label="Período das indicações"
        className="mt-4 grid grid-cols-3 gap-1 rounded-card bg-ink-100 p-1"
      >
        {PERIODS.map((item) => {
          const isActive = item.period === period;

          return (
            <Link
              key={item.period}
              href={referralPeriodHref(item.period)}
              scroll={false}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'rounded-md py-1.5 text-center text-[0.8125rem] font-semibold transition-colors duration-150',
                isActive
                  ? 'bg-white text-blue-700 ring-1 ring-ink-200'
                  : 'text-ink-500 hover:text-ink-900',
              )}
            >
              {item.tab}
            </Link>
          );
        })}
      </nav>

      {referrals.entries.length === 0 ? (
        <p className="mt-4 rounded-card border border-dashed border-ink-300 px-5 py-8 text-center text-[0.9375rem] text-ink-500">
          Nenhuma indicação neste período. Quando alguém contratar com o seu cupom, a venda aparece
          aqui.
        </p>
      ) : (
        <ul className="mt-2 divide-y divide-ink-100">
          {referrals.entries.map((referral) => {
            const status = STATUS[referral.status];
            const isCompleted = referral.status === ReferralStatusEnum.COMPLETED;

            return (
              <li key={referral.id} className="flex items-start justify-between gap-4 py-3.5">
                <div className="min-w-0">
                  <p className="font-semibold text-ink-900">{referral.title}</p>
                  <p className="mt-0.5 text-[0.8125rem] text-ink-500">
                    {referral.detail} ·{' '}
                    <span className="whitespace-nowrap" data-tabular>
                      {formatDate(referral.occurredAt)}
                    </span>
                  </p>
                </div>

                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  {/*
                    O incentivo pendente sai sem o verde: ele ainda depende do
                    serviço ser concluído e não entrou no saldo.
                  */}
                  <span
                    className={cn(
                      'whitespace-nowrap font-semibold',
                      isCompleted ? 'text-[var(--status-approved)]' : 'text-ink-500',
                    )}
                    data-tabular
                  >
                    + {formatBRL(referral.incentiveCents)}
                  </span>
                  <Badge tone={status.tone}>{status.label}</Badge>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
