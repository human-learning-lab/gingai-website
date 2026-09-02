/**
 * The briefing recording, in Firebase Storage.
 *
 *   team/briefings/{runId}/audio/{filename}
 *   team/briefings/{runId}/transcript.md   (written by lib/briefingStore)
 *
 * The recording of the room goes to Viktor's service to be transcribed and is
 * not kept there in any form we control, so this is the only copy that outlives
 * the transcription. Filed beside the transcript it produced.
 *
 * Storage rather than Firestore: these are media files of arbitrary size, and
 * Firestore caps a document at 1 MB. The filename is kept (sanitised), so
 * uploading the same file twice replaces it rather than accruing copies.
 */

const BUCKET = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
const STORAGE = 'https://firebasestorage.googleapis.com/v0/b';

function segment(raw: string) {
  return raw.trim().replace(/[^\w.-]+/g, '_') || 'unknown';
}

function objectUrl(path: string) {
  return `${STORAGE}/${BUCKET}/o/${encodeURIComponent(path)}`;
}

export function briefingAudioPrefix(runId: string) {
  return `team/briefings/${segment(runId)}/audio/`;
}

/* ── Compression ───────────────────────────────────────────────
 *
 * A file that is already in a lossy codec is left alone: re-encoding lossy to
 * lossy costs quality and saves little. Only uncompressed audio — what a
 * handheld recorder or a Mac produces as WAV or AIFF — is worth reworking, and
 * it is the case where the saving is large.
 *
 * That rework is downmix to mono and resample to 16 kHz, which is roughly 5.5x
 * smaller than 44.1 kHz stereo and is all a speech model can use anyway. It is
 * not codec compression: the browser ships no Opus or AAC encoder that can run
 * faster than real time, and encoding a 40-minute recording by playing it
 * through MediaRecorder would take 40 minutes. A WASM encoder would close that
 * gap if the sizes ever justify the dependency.
 */

const LOSSY = /^audio\/(mpeg|mp3|mp4|aac|x-m4a|ogg|opus|webm|3gpp|amr)/i;

/** 16 kHz mono is the working rate for speech, and what Whisper resamples to. */
const TARGET_RATE = 16_000;

export interface Compressed {
  blob: Blob;
  /** False when the original was already in a lossy codec and was left as-is. */
  reworked: boolean;
  originalBytes: number;
  bytes: number;
}

function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const ascii = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
  };

  ascii(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  ascii(8, 'WAVE');
  ascii(12, 'fmt ');
  view.setUint32(16, 16, true);          // PCM header size
  view.setUint16(20, 1, true);           // PCM
  view.setUint16(22, 1, true);           // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);           // block align
  view.setUint16(34, 16, true);          // bits per sample
  ascii(36, 'data');
  view.setUint32(40, samples.length * 2, true);

  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buffer], { type: 'audio/wav' });
}

export async function compressAudioFile(file: File): Promise<Compressed> {
  const original = file.size;

  if (LOSSY.test(file.type)) {
    return { blob: file, reworked: false, originalBytes: original, bytes: original };
  }

  const context = new AudioContext();
  try {
    const decoded = await context.decodeAudioData(await file.arrayBuffer());
    /* One channel in the OfflineAudioContext downmixes for us. */
    const offline = new OfflineAudioContext(
      1,
      Math.max(1, Math.ceil(decoded.duration * TARGET_RATE)),
      TARGET_RATE,
    );
    const source = offline.createBufferSource();
    source.buffer = decoded;
    source.connect(offline.destination);
    source.start();
    const rendered = await offline.startRendering();
    const blob = encodeWav(rendered.getChannelData(0), TARGET_RATE);
    return { blob, reworked: true, originalBytes: original, bytes: blob.size };
  } catch {
    /* Undecodable here does not mean unusable — hand the original over rather
       than refusing the upload. */
    return { blob: file, reworked: false, originalBytes: original, bytes: original };
  } finally {
    await context.close().catch(() => undefined);
  }
}

/* ── Storage ───────────────────────────────────────────────── */

export interface BriefingClip {
  path: string;
  name: string;
  url: string;
}

export async function uploadBriefingAudio(
  runId: string,
  blob: Blob,
  filename: string,
): Promise<BriefingClip> {
  if (!BUCKET) throw new Error('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET is not configured');
  if (!blob.size) throw new Error('The file is empty');

  const name = segment(filename);
  const path = `${briefingAudioPrefix(runId)}${name}`;
  const res = await fetch(
    `${STORAGE}/${BUCKET}/o?uploadType=media&name=${encodeURIComponent(path)}`,
    { method: 'POST', headers: { 'Content-Type': blob.type || 'application/octet-stream' }, body: blob },
  );
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Storage upload ${res.status}: ${detail.slice(0, 160)}`);
  }

  /* Custom metadata is discarded on upload and has to follow as a PATCH.
     Provenance is a nicety, so a failure here does not fail the upload. */
  await fetch(objectUrl(path), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      metadata: { runId, kind: 'briefing-audio', originalName: filename, uploadedAt: new Date().toISOString() },
    }),
  }).catch(() => undefined);

  return { path, name, url: `${objectUrl(path)}?alt=media` };
}

export async function listBriefingAudio(runId: string): Promise<BriefingClip[]> {
  if (!BUCKET) return [];
  const prefix = briefingAudioPrefix(runId);
  const res = await fetch(
    `${STORAGE}/${BUCKET}/o?prefix=${encodeURIComponent(prefix)}`,
    { cache: 'no-store' },
  );
  if (!res.ok) return [];
  const data = await res.json().catch(() => null) as { items?: { name?: string }[] } | null;

  return (data?.items ?? [])
    .map(item => item.name ?? '')
    .filter(Boolean)
    .map(path => ({ path, name: path.slice(prefix.length), url: `${objectUrl(path)}?alt=media` }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function deleteBriefingAudio(path: string): Promise<void> {
  if (!BUCKET) return;
  const res = await fetch(objectUrl(path), { method: 'DELETE' });
  if (!res.ok && res.status !== 404) throw new Error(`Storage delete ${res.status}`);
}
