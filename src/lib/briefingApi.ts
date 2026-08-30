/**
 * The briefing recording chain, against the endpoints that actually exist.
 *
 * The screen has always called three routes that were never built:
 * /api/sessions/{runId}/recording, /api/recordings/{id}/transcribe and
 * /api/recordings/{id}/structure. They are implemented here rather than
 * reshaped, so the screen's upload -> transcribe -> structure flow is untouched.
 *
 * Underneath, Viktor's API offers one relevant thing: POST /upload_media, which
 * takes base64 audio and transcribes it into the uploads table. There is no
 * per-upload read — GET /uploads/{id} answers 405 — so a row is found by
 * listing and matching the title we gave it.
 */

const BASE = process.env.VIKTOR_API_URL ?? 'https://wriggly-tutu-groin.ngrok-free.dev';
const HEADERS = { 'ngrok-skip-browser-warning': '1' };

export interface UploadRow {
  uploadid: number;
  username?: string;
  title?: string;
  content?: string;
  created_at?: string;
}

async function listUploads(): Promise<UploadRow[]> {
  // The collection paths 307-redirect; fetch follows redirects by default.
  const res = await fetch(`${BASE}/uploads/`, { headers: HEADERS, cache: 'no-store' });
  if (!res.ok) return [];
  const data = await res.json().catch(() => null);
  return Array.isArray(data) ? data as UploadRow[] : [];
}

/** A title unique enough to find the row again — the upload response carries no id. */
export function briefingTitle(runId: string, filename: string) {
  return `briefing:${runId}:${Date.now()}:${filename}`.slice(0, 240);
}

export async function uploadRecording(opts: {
  runId: string;
  filename: string;
  filetype: string;
  base64: string;
  user: string;
}): Promise<{ recordingId: string; title: string }> {
  const title = briefingTitle(opts.runId, opts.filename);

  const res = await fetch(`${BASE}/upload_media`, {
    method: 'POST',
    headers: { ...HEADERS, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      file: opts.base64,
      filetype: opts.filetype,
      user: opts.user,
      title,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`upload_media ${res.status}: ${detail.slice(0, 200)}`);
  }

  /* Prefer an id from the response, but do not depend on one: the endpoint's
     response shape is undocumented and has been null in other cases. Falling
     back to the title we just wrote makes this work either way. */
  const body = await res.json().catch(() => null) as { uploadid?: number; id?: number } | null;
  const fromBody = body?.uploadid ?? body?.id;
  if (fromBody) return { recordingId: String(fromBody), title };

  const match = (await listUploads()).find(u => u.title === title);
  if (!match) throw new Error('The recording uploaded but could not be found again.');
  return { recordingId: String(match.uploadid), title };
}

export interface RecordingOut {
  id: string;
  filename: string;
  duration: string;
  recordedAt: string;
  transcript: string;
}

export async function readRecording(recordingId: string): Promise<RecordingOut | null> {
  const row = (await listUploads()).find(u => String(u.uploadid) === recordingId);
  if (!row) return null;

  // Titles are written as "briefing:{runId}:{stamp}:{filename}".
  const parts = (row.title ?? '').split(':');
  const filename = parts.length >= 4 ? parts.slice(3).join(':') : row.title ?? 'recording';

  return {
    id: String(row.uploadid),
    filename,
    /* Not stored. The uploads table keeps the transcript and nothing about the
       audio, so there is no duration to report without re-reading the file. */
    duration: '—',
    recordedAt: row.created_at
      ? new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '—',
    transcript: row.content ?? '',
  };
}
