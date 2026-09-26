import type { Metadata } from 'next';
import {
  PayoutsTable,
  parsePayoutsParams,
  type RawSearchParams,
} from '@/backoffice/features/payouts';

export const metadata: Metadata = {
  title: 'Pagamentos',
  robots: { index: false, follow: false },
};

export default async function PayoutsPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const params = parsePayoutsParams(await searchParams);

  return (
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-[-0.02em] text-ink-900">Pagamentos</h1>
        <p className="mt-1.5 text-[0.9375rem] text-ink-500">
          Os saques via PIX dos afiliados, pela Transfeera. Só conferência: o saque é pedido pelo
          afiliado e não passa por aprovação.
        </p>
      </div>

      <PayoutsTable params={params} />
    </>
  );
}
