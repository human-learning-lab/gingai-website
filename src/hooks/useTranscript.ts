import { useState, useEffect, useRef, useCallback } from 'react';
import startAudioStreaming from '../audioStream'


interface TranscriptMessage {
	text: string;
	category?: string;
	sentiment?: number;
}

export function useTranscript() {
	const [lines, setLines]         = useState<string[]>([]);
	const [topics, setTopics]       = useState<string[]>([]);
	const [sentiment, setSentiment] = useState<number[]>([]);
	// Websocket connection to Transcription Service
	const wsRef = useRef(WebSocket);
	// Audio stream and context
	const streamRef = useRef(MediaStream);
	const audioContextRef = useRef(AudioContext);

	const connect = useCallback(async () => {
		if (wsRef.current) return;

		const {
			ws,
			stream,
			audioContext
		} = await startAudioStreaming();
		wsRef.current = ws;
		streamRef.current = stream;
		audioContextRef.current = audioContext;

		ws.onmessage = (e) => {
			try {
				const msg: TranscriptMessage = JSON.parse(e.data as string);
				if (msg.text) {
					setLines(prev => [...prev, msg.text]);
				}
				if (msg.category) {
					setTopics(prev =>
							  prev.includes(msg.category!) ? prev : [...prev, msg.category!]
							 );
				}
				if (msg.sentiment !== undefined) {
					setSentiment(prev => [...prev, msg.sentiment!]);
				}
			} catch {
				// ignore malformed messages
			}
		};

		ws.onerror = (err) => console.error('[Transcript WS] error', err);
		ws.onclose = ()  => { wsRef.current = null; };
	}, []);

	const disconnect = useCallback(() => {
		wsRef.current?.close();
		streamRef.current?.getTracks().forEach((t) => t.stop());
		audioContextRef.current?.close();

		wsRef.current = null;
		streamRef.current = null;
		audioContextRef.current = null;
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
