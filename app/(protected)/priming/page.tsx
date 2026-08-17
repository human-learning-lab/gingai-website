import type { Metadata } from 'next';
import CaptureClient from './CaptureClient';

export const metadata: Metadata = {
  title: 'Capture response Screen',
  description: 'Page for collecting sailor capture responses',
};


export default async function ResponsePage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id: runId } = await searchParams;
  if(!runId)
	  throw new Error("No run ID provided");
  return <CaptureClient runId={runId}/>;
}


