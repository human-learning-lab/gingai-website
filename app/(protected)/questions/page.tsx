import type { Metadata } from 'next';
import SailorPage from '@/screens/QuestionAnswers;

export const metadata: Metadata = {
  title: 'Response Screen',
  description: 'Page foor ',
};

export default function ResponsePage() {
  return <SailorPage/>;
}

