import type { Metadata } from 'next';
import CaptureClient from './CaptureClient';

export const metadata: Metadata = {
  title: 'Capture',
  description: 'Record and transcribe voice notes after racing. Speak freely — GingAI does the rest.',
};

export default function CapturePage() {
  return <CaptureClient />;
}
