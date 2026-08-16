'use client';

import { useCallback } from 'react';
import CaptureResponsePage from '@/screens/CaptureResponse';
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
    <CaptureResponsePage
	  runId={runId}
      transcriptLines={lines}
      onRecordingChange={handleRecordingChange}
    />
  );
}
