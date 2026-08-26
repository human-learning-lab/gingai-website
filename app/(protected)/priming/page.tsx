import type { Metadata } from 'next';
import CaptureClient from './CaptureClient';

export const metadata: Metadata = {
  title: 'Capture response Screen',
  description: 'Page for collecting sailor capture responses',
};


export default async function ResponsePage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; sailor?: string }>;
}) {
  const { id: runId, sailor } = await searchParams;
  if(!runId)
	  throw new Error("No run ID provided");
  /* `sailor` names whose question set this is. Without it the page falls back
     to the Clerk first name of whoever opens the link, which is wrong the
     moment a link is forwarded or opened on a shared device. */
  return <CaptureClient runId={runId} sailor={sailor}/>;
}


