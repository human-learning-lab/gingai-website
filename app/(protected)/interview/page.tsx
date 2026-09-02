import type { Metadata } from 'next';
import InterviewClient from './InterviewClient';
import { INTERVIEW_RUN_ID } from '@/data/interview';

export const metadata: Metadata = {
  title: 'Interview',
  description: 'Sailor context interview — one question per section of the profile',
};

export default async function InterviewPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; sailor?: string }>;
}) {
  const { id, sailor } = await searchParams;
  /* Unlike the race-day pages there is one interview run, so the id is optional
     and only ever overrides it. `sailor` names whose answers these are —
     without it the page falls back to the Clerk first name of whoever opens the
     link, which is wrong the moment a link is forwarded. */
  return <InterviewClient runId={id || INTERVIEW_RUN_ID} sailor={sailor} />;
}
