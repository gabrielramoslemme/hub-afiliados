import type { Metadata } from 'next';
import { DashboardScreen } from '@/backoffice/features/dashboard';

export const metadata: Metadata = {
  title: 'Dashboard',
  robots: { index: false, follow: false },
};

export default function AdminDashboardPage() {
  return <DashboardScreen />;
}
