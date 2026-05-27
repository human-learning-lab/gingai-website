import type { Metadata } from 'next';
import Capture from '@/screens/Capture';

export const metadata: Metadata = {
  title: 'Capture',
  description: 'Record and transcribe voice notes after racing. Speak freely — GingAI does the rest.',
};

export default function CapturePage() {
  return <Capture />;
}
