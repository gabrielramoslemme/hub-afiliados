import type { Metadata } from 'next';
import { HomeScreen, parseReferralPeriod, type RawSearchParams } from '@/affiliate/features/area';

export const metadata: Metadata = { title: 'Início' };

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  return <HomeScreen period={parseReferralPeriod(await searchParams)} />;
}
