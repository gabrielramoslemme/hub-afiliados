import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  PayoutEventOutcomeEnum,
  PayoutEventSourceEnum,
  type WithdrawalDetail,
  WithdrawalStatusEnum,
} from '@porto/contracts';
import { QUEUE_PATH } from '@/backoffice/shared/routes';
import { formatBRL, formatDate, formatDateTime, pixKeyTypeName } from '@/shared/lib/format';
import { WithdrawalStatusBadge } from './withdrawal-status-badge';

const SOURCE_LABELS: Record<PayoutEventSourceEnum, string> = {
  [PayoutEventSourceEnum.WEBHOOK]: 'Webhook',
  [PayoutEventSourceEnum.RECONCILIATION]: 'Reconciliação',
};

const OUTCOME_LABELS: Record<PayoutEventOutcomeEnum, string> = {
  [PayoutEventOutcomeEnum.APPLIED]: 'Aplicado',
  [PayoutEventOutcomeEnum.DUPLICATE]: 'Repetido',
  [PayoutEventOutcomeEnum.IGNORED]: 'Sem efeito',
  [PayoutEventOutcomeEnum.UNKNOWN_WITHDRAWAL]: 'Saque desconhecido',
};

function DataRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-b border-ink-200 py-4 last:border-0 sm:flex-row sm:gap-8">
      <dt className="w-40 shrink-0 text-sm text-ink-500">{label}</dt>
      <dd className="text-[0.9375rem] text-ink-900">{children}</dd>
    </div>
  );
}

export function PayoutDetail({ withdrawal }: { withdrawal: WithdrawalDetail }) {
  // As vendas voltam ao saldo quando o saque não se completa: o vazio explica
  // por que a lista está vazia, em vez de deixar a analista supor um bug.
  const returnedToBalance =
    withdrawal.status === WithdrawalStatusEnum.FAILED ||
    withdrawal.status === WithdrawalStatusEnum.RETURNED;
  const failedOrReturnedAt = withdrawal.failedAt ?? withdrawal.returnedAt;

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <section className="rounded-card border border-ink-200 bg-white p-6 lg:col-span-3">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link
              href={`${QUEUE_PATH}/${withdrawal.affiliatePublicId}`}
              className="text-lg font-bold tracking-[-0.02em] text-ink-900 transition-colors hover:text-blue-600"
            >
              {withdrawal.affiliateName}
            </Link>
            <p className="mt-0.5 text-[0.8125rem] text-ink-400" data-tabular>
              {withdrawal.maskedCpf}
            </p>
          </div>

          <div className="text-right">
            <p className="text-2xl font-bold tracking-[-0.02em] text-ink-900" data-tabular>
              {formatBRL(withdrawal.amountCents)}
            </p>
            <div className="mt-1 flex justify-end">
              <WithdrawalStatusBadge status={withdrawal.status} />
            </div>
          </div>
        </div>

        <dl className="mt-5">
          <DataRow label="Chave PIX">
            {pixKeyTypeName(withdrawal.pixKeyType)}
            <span className="text-ink-500">
              {' · '}
              <span data-tabular>{withdrawal.maskedPixKey}</span>
            </span>
          </DataRow>
          <DataRow label="Pedido em">
            <span data-tabular>{formatDateTime(withdrawal.requestedAt)}</span>
          </DataRow>
          <DataRow label="Pago em">
            <span data-tabular>{withdrawal.paidAt ? formatDateTime(withdrawal.paidAt) : '—'}</span>
          </DataRow>
          {withdrawal.endToEndId && (
            <DataRow label="Identificador (E2E)">
              <span data-tabular>{withdrawal.endToEndId}</span>
            </DataRow>
          )}
          {withdrawal.receiptUrl && (
            <DataRow label="Comprovante">
              <a
                href={withdrawal.receiptUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-blue-600 hover:underline"
              >
                Comprovante
              </a>
            </DataRow>
          )}
        </dl>

        {/* Bloco de destaque: a analista precisa ver o motivo sem procurar,
            porque é ele que explica por que o valor voltou ao saldo. */}
        {withdrawal.failureReason && (
          <div className="mt-5 rounded-card border border-[var(--status-rejected)]/20 bg-[var(--status-rejected-surface)] p-4">
            <p className="text-sm font-semibold text-[var(--status-rejected)]">Motivo</p>
            <p className="mt-1 text-[0.9375rem] leading-relaxed text-[var(--status-rejected)]">
              {withdrawal.failureReason}
            </p>
            {failedOrReturnedAt && (
              <p className="mt-2 text-[0.8125rem] text-[var(--status-rejected)]/80" data-tabular>
                {formatDateTime(failedOrReturnedAt)}
              </p>
            )}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-6 lg:col-span-2">
        <div className="rounded-card border border-ink-200 bg-white p-6">
          <h2 className="text-eyebrow uppercase text-ink-400">Vendas pagas</h2>

          {withdrawal.sales.length === 0 ? (
            <p className="mt-4 text-sm text-ink-500">
              {returnedToBalance
                ? 'As vendas deste saque voltaram ao saldo do afiliado.'
                : 'Nenhuma venda.'}
            </p>
          ) : (
            <ul className="mt-4 flex flex-col divide-y divide-ink-200">
              {withdrawal.sales.map((sale) => (
                <li
                  key={sale.publicId}
                  className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
                >
                  <div>
                    <p className="text-[0.9375rem] text-ink-900">{sale.item}</p>
                    <p className="text-[0.8125rem] text-ink-400" data-tabular>
                      {formatDate(sale.settledAt)}
                    </p>
                  </div>
                  <span className="shrink-0 font-semibold text-ink-900" data-tabular>
                    {formatBRL(sale.incentiveCents)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-card border border-ink-200 bg-white p-6">
          <h2 className="text-eyebrow uppercase text-ink-400">Trilha da Transfeera</h2>

          {withdrawal.events.length === 0 ? (
            <p className="mt-4 text-sm text-ink-500">
              A Transfeera ainda não notificou este saque.
            </p>
          ) : (
            <ol className="mt-4 flex flex-col">
              {withdrawal.events.map((event, index) => (
                <li key={event.publicId} className="relative flex gap-4 pb-6 last:pb-0">
                  <div className="flex flex-col items-center">
                    <span className="mt-1 size-2.5 shrink-0 rounded-full bg-blue-600" aria-hidden />
                    {index < withdrawal.events.length - 1 && (
                      <span className="mt-1 w-px flex-1 bg-ink-200" aria-hidden />
                    )}
                  </div>

                  <div className="pb-1">
                    <p className="text-[0.9375rem] font-semibold text-ink-900">
                      {event.providerStatus ?? '—'}
                      {' · '}
                      {OUTCOME_LABELS[event.outcome]}
                    </p>
                    <p className="mt-0.5 text-[0.8125rem] text-ink-500" data-tabular>
                      {formatDateTime(event.receivedAt)}
                      {` · ${SOURCE_LABELS[event.source]}`}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>
    </div>
  );
}
