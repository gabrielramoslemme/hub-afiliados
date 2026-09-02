import type { Metadata } from 'next';
import {
  CampaignsScreen,
  parseCampaignParams,
  type RawSearchParams,
} from '@/admin/features/campaigns';

export const metadata: Metadata = {
  title: 'Campanhas',
  robots: { index: false, follow: false },
};

export default async function CampaignsPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  return <CampaignsScreen params={parseCampaignParams(await searchParams)} />;
}
