import { Landmark, ShieldCheck } from 'lucide-react';
import type { AffiliateWalletResponse, PixKeyTypeEnum } from '@porto/contracts';
import { CountUp } from '@/affiliate/shared/components/count-up';
import { formatBRL, formatDateTime } from '@/shared/lib/format';

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
 * Não há botão de saque, ao contrário da referência que serviu de base: neste
 * programa o incentivo é pago pela Porto direto na chave cadastrada, sem a
 * pessoa pedir. Um botão que não corresponde a nada seria pior que a ausência
 * dele — o que o cartão faz é dizer para onde o dinheiro vai e quanto já foi.
 */
export function WalletCard({ wallet, pixKeyType, maskedPixKey }: WalletCardProps) {
  return (
    <section className="surface-brand surface-mesh relative isolate overflow-hidden rounded-panel p-6 text-white shadow-float sm:p-8">
      <p className="text-eyebrow uppercase text-blue-200">Saldo disponível</p>

      <CountUp
        cents={wallet.balanceCents}
        className="mt-3 text-[2.75rem] font-extrabold leading-none tracking-[-0.035em] sm:text-[3.25rem]"
      />

      <p className="mt-3 flex items-center gap-1.5 text-[0.8125rem] text-blue-200">
        <span className="relative flex size-1.5" aria-hidden>
          <span className="absolute inline-flex size-full animate-ping rounded-pill bg-cyan-300 opacity-70" />
          <span className="relative inline-flex size-1.5 rounded-pill bg-cyan-300" />
        </span>
        Atualizado em {formatDateTime(wallet.updatedAt)}
      </p>

      <dl className="mt-7 grid gap-3 border-t border-white/15 pt-6 sm:grid-cols-2">
        <div className="flex items-start gap-3">
          <Landmark className="mt-0.5 size-4 shrink-0 text-cyan-300" aria-hidden />
          <div>
            <dt className="text-[0.8125rem] text-blue-200">Recebe na chave</dt>
            <dd className="mt-0.5 text-[0.9375rem] font-semibold" data-tabular>
              {maskedPixKey}
              <span className="ml-2 font-normal text-blue-200">{PIX_LABELS[pixKeyType]}</span>
            </dd>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-cyan-300" aria-hidden />
          <div>
            <dt className="text-[0.8125rem] text-blue-200">Já pago pela Porto</dt>
            <dd className="mt-0.5 text-[0.9375rem] font-semibold" data-tabular>
              {formatBRL(wallet.paidCents)}
            </dd>
          </div>
        </div>
      </dl>
    </section>
  );
}
