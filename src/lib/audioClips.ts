/**
 * Answer audio, in Firebase Storage.
 *
 *   team/responses/{runId}/{kind}/{sailor}/q{n}.{webm|m4a}
 *
 * The transcription service is sent raw PCM and keeps none of it, so until now
 * a spoken answer existed only as whatever text came back. When that text comes
 * back mangled — and it does — there is nothing to go back to. Keeping the
 * compressed original means an answer can be re-transcribed later, or simply
 * listened to.
 *
 * Uploaded straight from the browser rather than through a route: the bucket is
 * already public config, and passing several megabytes of audio through a Next
 * handler buys nothing.
 */

const BUCKET = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
const STORAGE = 'https://firebasestorage.googleapis.com/v0/b';

/** Opus in WebM everywhere it exists; AAC in MP4 for Safari, which has no WebM. */
const CANDIDATES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4;codecs=mp4a.40.2',
  'audio/mp4',
];

/**
 * The recording format this browser will actually produce.
 *
 * Returns undefined where MediaRecorder is missing or supports none of them,
 * which callers must treat as "record nothing" rather than as an error — the
 * answer itself still goes through.
 */
export function pickAudioMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;
  return CANDIDATES.find(m => MediaRecorder.isTypeSupported(m));
}

/** Voice at 32 kbps is about 240 KB a minute — a squad's day is single-digit MB. */
export const AUDIO_BITS_PER_SECOND = 32000;

function extensionFor(mime: string) {
  return mime.includes('mp4') ? 'm4a' : 'webm';
}

function segment(raw: string) {
  return raw.trim().replace(/[^\w.-]+/g, '_') || 'unknown';
}

export function clipPath(
  runId: string,
  kind: string,
  sailor: string,
  index: number,
  mime: string,
) {
  return `team/responses/${segment(runId)}/${segment(kind)}/${segment(sailor)}/q${index + 1}.${extensionFor(mime)}`;
}

export interface UploadedClip {
  path: string;
  /** Playable URL, when the upload came back with a download token. */
  url?: string;
}

/**
 * Files one answer's audio. Rejects on failure so the caller can show it —
 * the sailor should not be told their answer is kept when it is not.
 */
export async function uploadClip(opts: {
  runId: string;
  kind: string;
  sailor: string;
  index: number;
  blob: Blob;
}): Promise<UploadedClip> {
  if (!BUCKET) throw new Error('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET is not configured');
  const { runId, kind, sailor, index, blob } = opts;
  if (!blob.size) throw new Error('The recording is empty');

  const mime = blob.type || 'audio/webm';
  const path = clipPath(runId, kind, sailor, index, mime);
  const object = `${STORAGE}/${BUCKET}/o/${encodeURIComponent(path)}`;

  const res = await fetch(
    `${STORAGE}/${BUCKET}/o?uploadType=media&name=${encodeURIComponent(path)}`,
    { method: 'POST', headers: { 'Content-Type': mime }, body: blob },
  );
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Storage upload ${res.status}: ${detail.slice(0, 160)}`);
  }

  /* Custom metadata is discarded on upload and has to follow as a PATCH.
     Provenance is a nicety, so a failure here does not fail the upload. */
  await fetch(object, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      metadata: {
        runId,
        kind,
        sailor,
        questionIndex: String(index + 1),
        recordedAt: new Date().toISOString(),
      },
    }),
  }).catch(() => undefined);

  const uploaded = await res.json().catch(() => null) as { downloadTokens?: string } | null;
  const token = uploaded?.downloadTokens?.split(',')[0];

  return { path, url: token ? `${object}?alt=media&token=${token}` : undefined };
}
