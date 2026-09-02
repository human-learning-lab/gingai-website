import type { Metadata } from 'next';
import InterviewConsolePage from '@/screens/InterviewConsole';

export const metadata: Metadata = {
  title: 'Interview console',
  description: 'Send the sailor context interview and build profiles from the answers',
};

export default function Page() {
  return <InterviewConsolePage />;
}
