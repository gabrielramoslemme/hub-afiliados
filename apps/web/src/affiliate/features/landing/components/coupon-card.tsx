import { Scissors } from 'lucide-react';
import { pendingFromPorto, pitch } from '@/affiliate/shared/content';

/**
 * O cupom é o produto — por isso ele é desenhado, e não uma foto de banco de
 * imagem. O recorte serrilhado sai de um `radial-gradient` na máscara, não de
 * uma imagem: escala em qualquer largura e não pesa nada.
 */
export function CouponCard() {
  return (
    <div className="relative w-full">
      <div className="overflow-hidden rounded-panel border border-white/20 bg-white shadow-float">
        <div className="relative flex items-center justify-between overflow-hidden bg-blue-600 px-6 py-4">
          {/* Um brilho atravessa a tarja de tempos em tempos, como em bilhete impresso. */}
          <span
            aria-hidden
            className="animate-shimmer absolute inset-y-0 -left-1/3 w-1/3 skew-x-12 bg-gradient-to-r from-transparent via-white/25 to-transparent"
          />
          <span className="relative text-eyebrow uppercase text-blue-200">Cupom do afiliado</span>
          <Scissors className="relative size-4 text-blue-200" aria-hidden />
        </div>

        <div
          className="h-4 bg-white"
          style={{
            backgroundImage:
              'radial-gradient(circle at 8px -2px, transparent 8px, var(--color-blue-600) 8px)',
            backgroundSize: '20px 16px',
            backgroundRepeat: 'repeat-x',
          }}
        />

        <div className="px-6 pb-7 pt-3">
          {/*
            Amostra, e não o cupom da pessoa: sem botão de copiar, de propósito.
            Um código copiável aqui é lido como um cupom que já existe — e o de
            verdade só nasce na área do afiliado, depois da aprovação, onde o
            `CopyCoupon` continua.
          */}
          <p
            className="inline-flex rounded-md border border-ink-200 bg-white px-2.5 py-1.5 font-mono text-sm font-semibold tracking-[0.08em] text-ink-900"
            data-tabular
          >
            {pitch.sampleCoupon}
          </p>

          <p className="mt-2.5 text-[0.8125rem] text-ink-500">
            Exclusivo, intransferível e sempre o mesmo em todo canal.
          </p>

          <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-md bg-ink-200">
            <div className="bg-blue-50 px-4 py-3">
              <dt className="text-[0.6875rem] font-semibold uppercase tracking-wider text-ink-500">
                Para o cliente
              </dt>
              <dd className="mt-1 text-sm font-semibold text-blue-700">
                {pendingFromPorto.customerDiscount ?? 'Desconto na contratação'}
              </dd>
            </div>
            <div className="bg-blue-50 px-4 py-3">
              <dt className="text-[0.6875rem] font-semibold uppercase tracking-wider text-ink-500">
                Para você
              </dt>
              <dd className="mt-1 text-sm font-semibold text-blue-700">
                {pendingFromPorto.incentivePerSale ?? 'Ganho em cada venda'}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
