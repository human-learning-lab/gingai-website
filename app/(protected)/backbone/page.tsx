import type { Metadata } from 'next';
import DayBackbone from '@/screens/DayBackbone';

export const metadata: Metadata = {
  title: 'Schedule',
  description: 'Live race day schedule with real-time weather, block status and team briefings.',
};

export default function BackbonePage() {
  return <DayBackbone />;
}
