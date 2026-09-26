import { Landmark } from 'lucide-react';
import type { AffiliateWalletResponse, PixKeyTypeEnum } from '@porto/contracts';
import { CountUp } from '@/affiliate/shared/components/count-up';
import { formatDateTime } from '@/shared/lib/format';

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
 * dele — o que o cartão faz é dizer quanto foi liberado e para onde vai.
 *
 * Também não há "saldo" nem "já pago": os pagamentos da Porto ainda não chegam
 * à Mesa, e um saldo que ignora o que já foi pago mentiria no primeiro deles.
 */
export function WalletCard({ wallet, pixKeyType, maskedPixKey }: WalletCardProps) {
  return (
    <section className="surface-brand surface-mesh relative isolate overflow-hidden rounded-panel p-6 text-white shadow-float sm:p-8">
      <p className="text-eyebrow uppercase text-blue-200">Incentivo liberado</p>

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
              A Porto paga direto nesta chave, sem você precisar pedir.
            </p>
          </div>
        </div>
      </dl>
    </section>
  );
}
