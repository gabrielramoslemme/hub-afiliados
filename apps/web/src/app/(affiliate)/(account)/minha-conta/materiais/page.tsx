import type { Metadata } from 'next';
import { MaterialsScreen } from '@/affiliate/features/area';

export const metadata: Metadata = { title: 'Materiais' };

export default function MaterialsPage() {
  return <MaterialsScreen />;
}
