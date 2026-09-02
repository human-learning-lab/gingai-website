'use client';

import { useCallback } from 'react';
import PrimingResponsePage from '@/screens/PrimingResponse';
import { useTranscript } from '@/hooks/useTranscript';

export default function DebriefClient({runId, sailor}: {runId: string; sailor?: string}) {
  const { lines, topics, sentiment, connect, disconnect, reset } = useTranscript();

  /* Stopping hands back the recording of what was just said, so the screen can
     file it against the question it answers. */
  const handleRecordingChange = useCallback((recording: boolean) => {
    if (recording) {
      reset();
      connect();
      return null;
    }
    return disconnect();
  }, [connect, disconnect, reset]);

  return (
    <PrimingResponsePage
	  runId={runId}
      sailorName={sailor}
      transcriptLines={lines}
      onRecordingChange={handleRecordingChange}
    />
  );
}
