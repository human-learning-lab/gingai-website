'use client';

import { useCallback } from 'react';
import CaptureResponsePage from '@/screens/CaptureResponse';
import { useTranscript } from '@/hooks/useTranscript';
import { INTERVIEW_KIND } from '@/data/interview';

/* The capture response screen, pointed at the interview run. Identical for the
   sailor — same recording, same transcript, same playback on the way out — the
   only difference is which set of questions it loads and where the answers go. */
export default function InterviewClient({ runId, sailor }: { runId: string; sailor?: string }) {
  const { lines, connect, disconnect, reset } = useTranscript();

  const handleRecordingChange = useCallback((recording: boolean) => {
    if (recording) {
      reset();
      connect();
      return null;
    }
    return disconnect();
  }, [connect, disconnect, reset]);

  return (
    <CaptureResponsePage
      runId={runId}
      sailorName={sailor}
      kind={INTERVIEW_KIND}
      transcriptLines={lines}
      onRecordingChange={handleRecordingChange}
    />
  );
}
