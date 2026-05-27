import type { Metadata } from 'next';
import DebriefClient from './DebriefClient';

export const metadata: Metadata = {
  title: 'Debrief',
  description: 'Live team debrief with AI synthesis, sentiment tracking and race analysis.',
};

export default function DebriefPage() {
  return <DebriefClient />;
}
