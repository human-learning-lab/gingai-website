import type { Metadata } from 'next';
import Library from '@/screens/Library';

export const metadata: Metadata = {
  title: 'Library',
  description: 'Coaching files, race videos, debriefs and data — organised by regatta.',
};

export default function LibraryPage() {
  return <Library />;
}
