'use client';

import { useCallback, useRef, useEffect, useState } from 'react';
import TeamDebrief from '@/screens/TeamDebrief';
import { useTranscript } from '@/hooks/useTranscript';

export default function DebriefClient() {
  const { lines, topics, sentiment, connect, disconnect, reset } = useTranscript();
  const [saved, setSaved] = useState(false);
  const [eventId, setEventId] = useState<number | null>(null);

  // Fetch the latest event ID on mount so we can save debriefs against it
  useEffect(() => {
    fetch('/api/transcripts')
      .then(r => r.json())
      .then(({ events }) => {
        if (Array.isArray(events) && events.length > 0) {
          const latest = events[events.length - 1];
          setEventId(latest.eventid);
        }
      })
      .catch(() => {/* silent — save will just fail gracefully */});
  }, []);

  // Keep a ref so the callback always sees the latest lines without re-creating
  const linesRef = useRef(lines);
  useEffect(() => { linesRef.current = lines; }, [lines]);

  const handleRecordingChange = useCallback((recording: boolean) => {
    if (recording) {
      reset();
      setSaved(false);
      connect();
    } else {
      disconnect();
      const currentLines = linesRef.current;
      if (currentLines.length > 0 && eventId !== null) {
        const content = currentLines.join('\n');
        const now = new Date();
        const summary = `Debrief · ${now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} ${now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
        fetch('/api/transcripts?type=debrief', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventid: eventId, summary, content }),
        }).then(async res => {
          if (res.ok) {
            setSaved(true);
          } else {
            const err = await res.text();
            console.error('[Debrief save] failed', res.status, err);
          }
        }).catch(err => console.error('[Debrief save] network error', err));
      }
    }
  }, [connect, disconnect, reset, eventId]);

  return (
    <TeamDebrief
      transcriptLines={lines}
      topics={topics}
      sentimentPts={sentiment}
      onRecordingChange={handleRecordingChange}
      saved={saved}
    />
  );
}
