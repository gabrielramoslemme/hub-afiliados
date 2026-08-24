import type { Metadata } from 'next';
import {
  AffiliatesQueue,
  parseQueueParams,
  type RawSearchParams,
} from '@/admin/features/affiliates';

export const metadata: Metadata = {
  title: 'Fila de afiliados',
  robots: { index: false, follow: false },
};

export default async function AffiliatesQueuePage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const params = parseQueueParams(await searchParams);

  return (
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-[-0.02em] text-ink-900">Fila de afiliados</h1>
        <p className="mt-1.5 text-[0.9375rem] text-ink-500">
          Cada cadastro é analisado por uma pessoa. A decisão fica registrada na trilha e não pode
          ser desfeita pelo painel.
        </p>
      </div>

      <AffiliatesQueue params={params} />
    </>
  );
}
