import type { Metadata } from 'next';
import DayBackbone from '@/screens/DayBackbone';

export const metadata: Metadata = {
  title: 'Sim',
  description: 'Simulator training session schedule, documents, and data upload.',
};

export default function SimPage() {
  return <DayBackbone forceSim />;
}
