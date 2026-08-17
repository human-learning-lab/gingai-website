'use client';

import { useCallback } from 'react';
import PrimingResponsePage from '@/screens/PrimingResponse';
import { useTranscript } from '@/hooks/useTranscript';

export default function DebriefClient({runId}: {runId: string}) {
  const { lines, topics, sentiment, connect, disconnect, reset } = useTranscript();

  const handleRecordingChange = useCallback((recording: boolean) => {
    if (recording) {
      reset();
      connect();
    } else {
      disconnect();
    }
  }, [connect, disconnect, reset]);

  return (
    <PrimingResponsePage
	  runId={runId}
      transcriptLines={lines}
      onRecordingChange={handleRecordingChange}
    />
  );
}
