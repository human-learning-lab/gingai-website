import type { Metadata } from 'next';
import PrimingResponsePage from '@/screens/PrimingResponse'

export const metadata: Metadata = {
  title: 'Priming response Screen',
  description: 'Page for collecting sailor priming responses',
};

export default function ResponsePage() {
  return <PrimingResponsePage/>;
}

