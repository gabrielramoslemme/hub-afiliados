import type { Metadata } from 'next';
import { MaterialsScreen } from '@/backoffice/features/materials';

export const metadata: Metadata = {
  title: 'Materiais',
  robots: { index: false, follow: false },
};

export default function MaterialsPage() {
  return <MaterialsScreen />;
}
