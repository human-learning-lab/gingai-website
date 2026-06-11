import type { Metadata } from 'next';
import Sim from '@/screens/Sim';

export const metadata: Metadata = {
  title: 'Sim',
  description: 'Simulator training session schedule, documents, and data upload.',
};

export default function SimPage() {
  return <Sim />;
}
