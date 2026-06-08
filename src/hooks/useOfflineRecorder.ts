'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  saveRecording,
  getPendingRecordings,
  updateRecordingStatus,
  deleteRecording,
  type OfflineRecording,
} from '@/lib/offlineDb';

function autoTitle(): string {
  return `Capture · ${new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} · ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
}

function preferredMimeType(): string {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
  return candidates.find(t => MediaRecorder.isTypeSupported(t)) ?? '';
}

export function useOfflineRecorder() {
  const [isRecording, setIsRecording]       = useState(false);
  const [duration, setDuration]             = useState(0);
  const [pending, setPending]               = useState<OfflineRecording[]>([]);
  const [uploadingId, setUploadingId]       = useState<string | null>(null);
  const [lastSaved, setLastSaved]           = useState<string | null>(null);

  const mediaRef  = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAt = useRef<number>(0);

  // Load pending recordings on mount
  useEffect(() => {
    getPendingRecordings().then(setPending).catch(console.error);
  }, []);

  const refreshPending = useCallback(async () => {
    const recs = await getPendingRecordings();
    setPending(recs);
  }, []);

  const startRecording = useCallback(async () => {
    chunksRef.current = [];
    setDuration(0);
    setLastSaved(null);

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mimeType = preferredMimeType();
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

    recorder.ondataavailable = e => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.start(500); // collect chunks every 500 ms
    mediaRef.current = recorder;
    startedAt.current = Date.now();
    setIsRecording(true);

    timerRef.current = setInterval(() => {
      setDuration(Math.floor((Date.now() - startedAt.current) / 1000));
    }, 1000);
  }, []);

  const stopRecording = useCallback((): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!mediaRef.current) { reject(new Error('No active recorder')); return; }

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      const recorder = mediaRef.current;
      const mimeType = recorder.mimeType || 'audio/webm';

      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const dur  = Math.floor((Date.now() - startedAt.current) / 1000);
        const rec: OfflineRecording = {
          id: crypto.randomUUID(),
          title: autoTitle(),
          timestamp: Date.now(),
          duration: dur,
          blob,
          mimeType,
          status: 'pending',
        };
        // Stop all mic tracks
        recorder.stream.getTracks().forEach(t => t.stop());
        mediaRef.current = null;

        await saveRecording(rec);
        await refreshPending();
        setIsRecording(false);
        setLastSaved(rec.id);
        resolve(rec.id);
      };

      recorder.onerror = e => reject(e);
      recorder.stop();
    });
  }, [refreshPending]);

  const uploadRecording = useCallback(async (id: string, userName?: string) => {
    const recs = await getPendingRecordings();
    const rec  = recs.find(r => r.id === id);
    if (!rec) return;

    setUploadingId(id);
    await updateRecordingStatus(id, 'uploading');
    await refreshPending();

    try {
      const ext  = rec.mimeType.includes('ogg') ? 'ogg' : rec.mimeType.includes('mp4') ? 'mp4' : 'webm';
      const file = new File([rec.blob], `${rec.title}.${ext}`, { type: rec.mimeType });
      const form = new FormData();
      form.append('file', file);
      if (userName) form.append('user', userName);
      form.append('title', rec.title);

      const res = await fetch('/api/offline-upload', { method: 'POST', body: form });
      if (!res.ok) throw new Error(`Upload failed: ${res.status}`);

      await updateRecordingStatus(id, 'done');
      // Remove from IndexedDB after successful upload
      await deleteRecording(id);
    } catch (err) {
      console.error(err);
      await updateRecordingStatus(id, 'error');
    }

    setUploadingId(null);
    await refreshPending();
  }, [refreshPending]);

  const removeRecording = useCallback(async (id: string) => {
    await deleteRecording(id);
    await refreshPending();
  }, [refreshPending]);

  return {
    isRecording,
    duration,
    pending,
    uploadingId,
    lastSaved,
    startRecording,
    stopRecording,
    uploadRecording,
    removeRecording,
  };
}
