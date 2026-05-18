'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

const WS_URL = 'ws://localhost:8000/Transcript';

interface TranscriptMessage {
  text: string;
  category?: string;
  sentiment?: number;
}

export function useTranscript() {
  const [lines, setLines]         = useState<string[]>([]);
  const [topics, setTopics]       = useState<string[]>([]);
  const [sentiment, setSentiment] = useState<number[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current) return;
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onmessage = (e) => {
      try {
        const msg: TranscriptMessage = JSON.parse(e.data as string);
        if (msg.text) setLines(prev => [...prev, msg.text]);
        if (msg.category) setTopics(prev => prev.includes(msg.category!) ? prev : [...prev, msg.category!]);
        if (msg.sentiment !== undefined) setSentiment(prev => [...prev, msg.sentiment!]);
      } catch {
        // ignore malformed messages
      }
    };

    ws.onerror = (err) => console.error('[Transcript WS] error', err);
    ws.onclose = () => { wsRef.current = null; };
  }, []);

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
  }, []);

  const reset = useCallback(() => {
    setLines([]);
    setTopics([]);
    setSentiment([]);
  }, []);

  useEffect(() => {
    return () => { wsRef.current?.close(); };
  }, []);

  return { lines, topics, sentiment, connect, disconnect, reset };
}
