import { Clock, MessageCircle, Scissors } from 'lucide-react';
import type { Metadata } from 'next';
import { CopyCoupon } from '@/components/copy-coupon';
import { pitch } from '@/core/content/landing';
import { PageHeading } from '@/features/affiliate-area/page-heading';
import { fetchAccount } from '@/features/affiliate-area/queries';

export const metadata: Metadata = { title: 'Seu cupom' };

export default async function CouponPage() {
  const account = await fetchAccount();

  return (
    <>
      <PageHeading title="Seu cupom" lead="O código que liga cada venda a você." />

      <div className="mt-7 grid gap-6 lg:grid-cols-2 lg:items-start">
        {account.coupon ? (
          <section className="overflow-hidden rounded-panel border border-ink-200 bg-white shadow-card">
            <div className="relative flex items-center justify-between overflow-hidden bg-blue-600 px-6 py-4">
              <span
                aria-hidden
                className="animate-shimmer absolute inset-y-0 -left-1/3 w-1/3 skew-x-12 bg-gradient-to-r from-transparent via-white/25 to-transparent"
              />
              <span className="relative text-eyebrow uppercase text-blue-200">
                Cupom do afiliado
              </span>
              <Scissors className="relative size-4 text-blue-200" aria-hidden />
            </div>

            {/* Mesmo serrilhado do cupom da landing: é o mesmo objeto. */}
            <div
              className="h-4 bg-white"
              style={{
                backgroundImage:
                  'radial-gradient(circle at 8px -2px, transparent 8px, var(--color-blue-600) 8px)',
                backgroundSize: '20px 16px',
                backgroundRepeat: 'repeat-x',
              }}
            />

            <div className="px-6 pb-7 pt-4">
              <CopyCoupon code={account.coupon} className="flex-wrap" />
              <p className="mt-3 text-[0.8125rem] leading-relaxed text-ink-500">
                Exclusivo, intransferível e o mesmo em todo canal. O cliente digita este código no
                campo de desconto ao contratar pelo site ou pelo WhatsApp da Porto Serviço.
              </p>
            </div>
          </section>
        ) : (
          <section className="flex items-start gap-3.5 rounded-panel border border-dashed border-ink-300 bg-white p-6">
            <Clock className="mt-0.5 size-5 shrink-0 text-[var(--status-pending)]" aria-hidden />
            <div>
              <h2 className="font-semibold text-ink-900">Seu cupom ainda não foi emitido</h2>
              <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink-500">
                Ele é liberado pela Porto quando o cadastro é aprovado, e aparece aqui assim que
                sair. Você também recebe um aviso por e-mail.
              </p>
            </div>
          </section>
        )}

        <section className="rounded-panel border border-ink-200 bg-white p-6">
          <h2 className="text-eyebrow uppercase text-ink-400">{pitch.phrasesLabel}</h2>

          <ul className="mt-4 flex flex-col gap-3">
            {pitch.phrases.map((phrase) => (
              <li key={phrase} className="flex items-start gap-2.5 text-[0.9375rem] text-ink-700">
                <MessageCircle className="mt-0.5 size-4 shrink-0 text-blue-600" aria-hidden />
                <span>“{phrase}”</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
