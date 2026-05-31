'use client';

import { useCallback } from 'react';
import Capture from '@/screens/Capture';
import { useTranscript } from '@/hooks/useTranscript';

export default function DebriefClient() {
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
    <Capture
      transcriptLines={lines}
      topics={topics}
      sentimentPts={sentiment}
      onRecordingChange={handleRecordingChange}
    />
  );
}
