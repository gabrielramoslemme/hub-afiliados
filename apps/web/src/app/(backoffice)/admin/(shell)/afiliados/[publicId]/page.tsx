import type { Metadata } from 'next';
import { AffiliateDetailScreen } from '@/backoffice/features/affiliates';

export const metadata: Metadata = {
  title: 'Cadastro do afiliado',
  robots: { index: false, follow: false },
};

export default async function AffiliateDetailPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;

  return <AffiliateDetailScreen publicId={publicId} />;
}
