import type { Metadata } from 'next';
import QuestionSets from '@/screens/QuestionSets';

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Dashboard for managing questions and responses',
};

export default function DashPage() {
  return <QuestionSets/>;
}

