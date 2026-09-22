import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { AffiliateStatusEnum, CouponStatusEnum, PixKeyTypeEnum } from '@porto/contracts';
import { QUEUE_PATH } from '@/backoffice/shared/routes';
import {
  formatCpfDisplay,
  formatDateTime,
  formatPixKeyDisplay,
  formatSocialProfile,
} from '@/shared/lib/format';
import { fetchAffiliate, fetchAffiliateHistory, fetchCouponHistory } from '../data';
import { buildTrail } from '../lib/trail';
import { AffiliateStatusBadge } from './affiliate-status';
import { CouponActions } from './coupon-actions';
import { DecisionActions } from './decision-actions';

const PIX_KEY_LABELS: Record<PixKeyTypeEnum, string> = {
  [PixKeyTypeEnum.EMAIL]: 'E-mail',
  [PixKeyTypeEnum.PHONE]: 'Telefone',
  [PixKeyTypeEnum.CPF]: 'CPF',
};

function DataRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-b border-ink-200 py-4 last:border-0 sm:flex-row sm:gap-8">
      <dt className="w-44 shrink-0 text-sm text-ink-500">{label}</dt>
      <dd className="text-[0.9375rem] text-ink-900">{children}</dd>
    </div>
  );
}

export async function AffiliateDetailScreen({ publicId }: { publicId: string }) {
  const [affiliate, history, couponHistory] = await Promise.all([
    fetchAffiliate(publicId),
    fetchAffiliateHistory(publicId),
    fetchCouponHistory(publicId),
  ]);

  const trail = buildTrail(history, couponHistory);

  const pending = affiliate.status === AffiliateStatusEnum.PENDING_APPROVAL;
  const social = formatSocialProfile(affiliate.socialNetwork, affiliate.socialHandle);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link
          href={QUEUE_PATH}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 transition-colors hover:text-blue-600"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Voltar para a fila
        </Link>

        <div className="mt-5 flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold tracking-[-0.02em] text-ink-900">
                {affiliate.name}
              </h1>
              <AffiliateStatusBadge status={affiliate.status} />
            </div>
            <p className="mt-1.5 text-[0.9375rem] text-ink-500">{affiliate.email}</p>
          </div>

          {/* A ação só existe para cadastro em análise — decidido não redecide. */}
          {pending && <DecisionActions publicId={affiliate.publicId} name={affiliate.name} />}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <section className="rounded-card border border-ink-200 bg-white p-6 lg:col-span-3">
          <h2 className="text-eyebrow uppercase text-ink-400">Dados do cadastro</h2>

          <dl className="mt-4">
            <DataRow label="Nome completo">{affiliate.name}</DataRow>
            <DataRow label="E-mail">{affiliate.email}</DataRow>
            {/* Detalhe é onde a análise precisa do CPF completo. */}
            <DataRow label="CPF">
              <span data-tabular>{formatCpfDisplay(affiliate.cpf)}</span>
            </DataRow>
            {/* Detalhe é também onde a análise precisa do RG completo. */}
            <DataRow label="RG">
              <span data-tabular>{affiliate.rg}</span>
            </DataRow>
            {social && <DataRow label="Rede social">{social}</DataRow>}
            <DataRow label="Tipo de chave PIX">{PIX_KEY_LABELS[affiliate.pixKeyType]}</DataRow>
            <DataRow label="Chave PIX">
              <span data-tabular>
                {formatPixKeyDisplay(affiliate.pixKeyType, affiliate.pixKey)}
              </span>
            </DataRow>
            <DataRow label="Enviado em">
              <span data-tabular>{formatDateTime(affiliate.createdAt)}</span>
            </DataRow>
            {affiliate.approvedByName && (
              <DataRow label="Decidido por">{affiliate.approvedByName}</DataRow>
            )}
            {/*
              A analista escolhe o cupom no diálogo e nunca mais o vê. Aqui é
              onde ela responde "qual é o cupom desta pessoa?"
              quando o afiliado liga dias depois.
            */}
            {affiliate.coupon && (
              <DataRow label="Cupom">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <span>
                    <span data-tabular className="font-semibold">
                      {affiliate.coupon.code}
                    </span>
                    <span className="text-ink-500">
                      {' · '}
                      {affiliate.coupon.discountPercent}% de desconto
                      {affiliate.coupon.status === CouponStatusEnum.INACTIVE && ' · inativo'}
                    </span>
                  </span>
                  <CouponActions publicId={affiliate.publicId} coupon={affiliate.coupon} />
                </div>
              </DataRow>
            )}
            {affiliate.rejectionReason && (
              <DataRow label="Motivo da reprovação">
                <span className="block max-w-prose leading-relaxed">
                  {affiliate.rejectionReason}
                </span>
              </DataRow>
            )}
          </dl>
        </section>

        <section className="rounded-card border border-ink-200 bg-white p-6 lg:col-span-2">
          <h2 className="text-eyebrow uppercase text-ink-400">Trilha de auditoria</h2>

          {/*
            Append-only: registro novo a cada evento, sem edição e sem exclusão.
            A trilha é o que transforma a decisão em prova, e não em estado.
          */}
          <ol className="mt-5 flex flex-col">
            {trail.map((entry, index) => (
              <li key={entry.key} className="relative flex gap-4 pb-6 last:pb-0">
                <div className="flex flex-col items-center">
                  <span className="mt-1 size-2.5 shrink-0 rounded-full bg-blue-600" aria-hidden />
                  {index < trail.length - 1 && (
                    <span className="mt-1 w-px flex-1 bg-ink-200" aria-hidden />
                  )}
                </div>

                <div className="pb-1">
                  <p className="text-[0.9375rem] font-semibold text-ink-900">{entry.title}</p>
                  <p className="mt-0.5 text-[0.8125rem] text-ink-500" data-tabular>
                    {formatDateTime(entry.createdAt)}
                    {entry.actorName ? ` · ${entry.actorName}` : ' · pelo próprio afiliado'}
                  </p>
                  {entry.reason && (
                    <p className="mt-2 border-l-2 border-ink-200 pl-3 text-[0.875rem] leading-relaxed text-ink-500">
                      {entry.reason}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
