import { useState, useEffect, useRef, useCallback } from 'react';
import startAudioStreaming from '../audioStream'
import { AUDIO_BITS_PER_SECOND, pickAudioMimeType } from '@/lib/audioClips';


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
	const wsRef = useRef<WebSocket | null>(null);
	// Audio stream and context
	const streamRef = useRef<MediaStream | null>(null);
	const audioContextRef = useRef<AudioContext | null>(null);
	/* Records the same MediaStream the worklet is reading. Opening a second
	   getUserMedia for this would be simpler to write, but iOS Safari can hand
	   the second caller a track that kills the first — taking transcription
	   down with it. One microphone, two consumers. */
	const recorderRef = useRef<MediaRecorder | null>(null);
	const chunksRef = useRef<Blob[]>([]);

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

		/* No supported container means no recording — the answer still goes
		   through on the transcript alone. */
		const mimeType = pickAudioMimeType();
		if (mimeType) {
			try {
				const recorder = new MediaRecorder(stream, {
					mimeType,
					audioBitsPerSecond: AUDIO_BITS_PER_SECOND,
				});
				chunksRef.current = [];
				recorder.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data); };
				recorder.start();
				recorderRef.current = recorder;
			} catch (err) {
				console.error('[Transcript] could not record audio', err);
			}
		}

		ws.onmessage = (e) => {
			try {
				const msg: TranscriptMessage = JSON.parse(e.data as string);
				if (msg.text) {
					setLines(prev => {
						// Skip consecutive duplicates (streaming ASR sends partial + final)
						if (prev[prev.length - 1] === msg.text) return prev;
						return [...prev, msg.text];
					});
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

	/**
	 * Closes everything down and hands back the recording.
	 *
	 * The recorder is stopped and drained before the tracks are, because
	 * stopping a track first discards whatever has not been flushed — which is
	 * always the end of the last thing said.
	 */
	const disconnect = useCallback(async (): Promise<Blob | null> => {
		const recorder = recorderRef.current;
		recorderRef.current = null;

		let clip: Blob | null = null;
		if (recorder && recorder.state !== 'inactive') {
			clip = await new Promise<Blob | null>((resolve) => {
				recorder.onstop = () => resolve(
					chunksRef.current.length
						? new Blob(chunksRef.current, { type: recorder.mimeType })
						: null,
				);
				recorder.stop();
			});
		}
		chunksRef.current = [];

		wsRef.current?.close();
		streamRef.current?.getTracks().forEach((t) => t.stop());
		audioContextRef.current?.close();

		wsRef.current = null;
		streamRef.current = null;
		audioContextRef.current = null;

		return clip;
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
