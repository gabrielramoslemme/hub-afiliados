import { Clock } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { CouponActions } from './coupon-actions';

const countFormatter = new Intl.NumberFormat('pt-BR');

interface CouponPanelProps {
  coupon: string | null;
  discountPercent: number | null;
  couponUses: number;
  className?: string;
}

/**
 * O cupom é o que a pessoa veio buscar na maior parte das visitas: copiar ou
 * mandar para alguém. Por isso ele sobe para antes da lista no celular, e os
 * dois botões ficam colados ao código.
 */
export function CouponPanel({ coupon, discountPercent, couponUses, className }: CouponPanelProps) {
  if (!coupon) {
    return (
      <section
        className={cn(
          'flex items-start gap-3.5 rounded-panel border border-dashed border-ink-300 bg-white p-6',
          className,
        )}
      >
        <Clock className="mt-0.5 size-5 shrink-0 text-[var(--status-pending)]" aria-hidden />
        <div>
          <h2 className="font-semibold text-ink-900">Seu cupom ainda não foi emitido</h2>
          <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink-500">
            Ele é liberado pela Porto quando o cadastro é aprovado, e aparece aqui assim que sair.
            Você também recebe um aviso por e-mail.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className={cn('rounded-panel border border-ink-200 bg-white p-6', className)}>
      <h2 className="font-semibold text-ink-900">Seu cupom</h2>
      <p className="mt-1 text-[0.8125rem] text-ink-500">
        Compartilhe seu código e acompanhe o uso.
      </p>

      <p
        className="mt-5 select-all rounded-card border border-ink-200 bg-ink-50 px-4 py-5 text-center font-mono text-2xl font-bold tracking-[0.14em] text-blue-900"
        data-tabular
      >
        {coupon}
      </p>

      <div className="mt-4">
        <CouponActions code={coupon} discountPercent={discountPercent} />
      </div>

      <p className="text-[0.8125rem] leading-relaxed text-ink-500">
        {discountPercent === null ? (
          'Vale para quem contratar com o código'
        ) : (
          <>
            <strong className="font-semibold text-ink-700">{discountPercent}% de desconto</strong>{' '}
            para quem contratar com o código
          </>
        )}
        , pelo site ou pelo WhatsApp da Porto Serviço.
      </p>

      <dl className="mt-5 flex items-baseline justify-between border-t border-ink-200 pt-4">
        <dt className="text-sm text-ink-500">Cupons utilizados</dt>
        <dd className="font-semibold text-ink-900" data-tabular>
          {countFormatter.format(couponUses)}
        </dd>
      </dl>
    </section>
  );
}
