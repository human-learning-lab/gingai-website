import type { Metadata } from 'next';
import SailorPage from '@/screens/QuestionsAnswers'

export const metadata: Metadata = {
  title: 'Response Screen',
  description: 'Page for collecting sailor responses',
};

export default function ResponsePage() {
  return <SailorPage/>;
}

