import { Landmark } from 'lucide-react';
import type { AffiliateWalletResponse, PixKeyTypeEnum } from '@porto/contracts';
import { CountUp } from '@/affiliate/shared/components/count-up';
import { formatBRL, formatDateTime } from '@/shared/lib/format';
import { WithdrawDialog } from './withdraw-dialog';

const PIX_LABELS: Record<PixKeyTypeEnum, string> = {
  EMAIL: 'E-mail',
  PHONE: 'Telefone',
  CPF: 'CPF',
} as Record<PixKeyTypeEnum, string>;

interface WalletCardProps {
  wallet: AffiliateWalletResponse;
  pixKeyType: PixKeyTypeEnum;
  maskedPixKey: string;
}

/**
 * O saldo é o que o botão saca, inteiro: incentivos liberados que nenhum saque
 * reservou. O que está a caminho e o que já foi pago ficam embaixo, para a
 * pessoa não achar que o saque "sumiu" com o dinheiro.
 */
export function WalletCard({ wallet, pixKeyType, maskedPixKey }: WalletCardProps) {
  return (
    <section className="surface-brand surface-mesh relative isolate overflow-hidden rounded-panel p-6 text-white shadow-float sm:p-8">
      <p className="text-eyebrow uppercase text-blue-200">Saldo disponível</p>

      <CountUp
        cents={wallet.availableCents}
        className="mt-3 text-[2.75rem] font-extrabold leading-none tracking-[-0.035em] sm:text-[3.25rem]"
      />

      <p className="mt-3 flex items-center gap-1.5 text-[0.8125rem] text-blue-200">
        <span className="relative flex size-1.5" aria-hidden>
          <span className="absolute inline-flex size-full animate-ping rounded-pill bg-cyan-300 opacity-70" />
          <span className="relative inline-flex size-1.5 rounded-pill bg-cyan-300" />
        </span>
        Atualizado em {formatDateTime(wallet.updatedAt)}
      </p>

      <dl className="mt-7 border-t border-white/15 pt-6">
        <div className="flex items-start gap-3">
          <Landmark className="mt-0.5 size-4 shrink-0 text-cyan-300" aria-hidden />
          {/* `break-all`: a chave de e-mail mascarada não tem espaço para quebrar. */}
          <div className="min-w-0">
            <dt className="text-[0.8125rem] text-blue-200">Recebe na chave</dt>
            <dd className="mt-0.5 break-all text-[0.9375rem] font-semibold" data-tabular>
              {maskedPixKey}
              <span className="ml-2 font-normal text-blue-200">{PIX_LABELS[pixKeyType]}</span>
            </dd>
            <p className="mt-1 text-[0.8125rem] text-blue-200">
              O saque vai para esta chave. Para trocar, use o perfil.
            </p>
          </div>
        </div>

        {wallet.inFlightCents > 0 && (
          <div className="mt-4 flex items-baseline justify-between gap-3">
            <dt className="text-[0.8125rem] text-blue-200">Em processamento</dt>
            <dd className="font-semibold" data-tabular>
              {formatBRL(wallet.inFlightCents)}
            </dd>
          </div>
        )}
        {wallet.withdrawnCents > 0 && (
          <div className="mt-2 flex items-baseline justify-between gap-3">
            <dt className="text-[0.8125rem] text-blue-200">Já sacado</dt>
            <dd className="font-semibold" data-tabular>
              {formatBRL(wallet.withdrawnCents)}
            </dd>
          </div>
        )}
      </dl>

      <WithdrawDialog availableCents={wallet.availableCents} maskedPixKey={maskedPixKey} />
    </section>
  );
}
