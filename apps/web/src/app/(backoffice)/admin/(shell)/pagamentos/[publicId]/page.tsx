import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { WithdrawalDetail } from '@porto/contracts';
import { fetchWithdrawal, PayoutDetail } from '@/backoffice/features/payouts';
import { PAYOUTS_PATH } from '@/backoffice/shared/routes';
import { ApiError } from '@/shared/http/api-error';

export const metadata: Metadata = {
  title: 'Saque',
  robots: { index: false, follow: false },
};

export default async function PayoutDetailPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;

  let withdrawal: WithdrawalDetail;
  try {
    withdrawal = await fetchWithdrawal(publicId);
  } catch (error) {
    // 404 é saque que não existe; 400 é `publicId` que não é um uuid válido —
    // as duas contam a mesma história para quem navegou até aqui.
    if (error instanceof ApiError && (error.statusCode === 404 || error.statusCode === 400)) {
      notFound();
    }

    throw error;
  }

  return (
    <div className="flex flex-col gap-8">
      <Link
        href={PAYOUTS_PATH}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 transition-colors hover:text-blue-600"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Voltar para pagamentos
      </Link>

      <PayoutDetail withdrawal={withdrawal} />
    </div>
  );
}
