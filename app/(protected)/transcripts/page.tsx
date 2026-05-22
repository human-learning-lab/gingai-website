import type { Metadata } from 'next';
import Transcripts from '@/screens/Transcripts';

export const metadata: Metadata = {
  title: 'Transcripts',
  description: 'All race, capture, debrief and upload transcripts. Search, filter and edit.',
};

export default function TranscriptsPage() {
  return <Transcripts />;
}
