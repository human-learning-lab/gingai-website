import type { Metadata } from 'next';
import Alarms from '@/screens/Alarms';

export const metadata: Metadata = {
  title: 'Alarms',
  description: 'Create and manage live performance alarms triggered by data point thresholds.',
};

export default function AlarmsPage() {
  return <Alarms />;
}
