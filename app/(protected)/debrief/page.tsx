'use client';

import { useCallback } from 'react';
import TeamDebrief from '@/screens/TeamDebrief';
import { useTranscript } from '@/hooks/useTranscript';

export default function DebriefPage() {
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
    <TeamDebrief
      transcriptLines={lines}
      topics={topics}
      sentimentPts={sentiment}
      onRecordingChange={handleRecordingChange}
    />
  );
}
