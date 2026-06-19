import type { Metadata } from 'next';
import RaceSummary from '@/screens/RaceSummary';

export const metadata: Metadata = {
  title: 'Race Summary',
  description: 'AI-generated event summaries with action items, key wins and open questions.',
};

export default function RaceSummaryPage() {
  return <RaceSummary />;
}
