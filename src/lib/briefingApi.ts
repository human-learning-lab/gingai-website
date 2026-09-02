/**
 * The briefing recording chain, against the endpoints that actually exist.
 *
 * The screen has always called three routes that were never built:
 * /api/sessions/{runId}/recording, /api/recordings/{id}/transcribe and
 * /api/recordings/{id}/structure. They are implemented here rather than
 * reshaped, so the screen's upload -> transcribe -> structure flow is untouched.
 *
 * Underneath, Viktor's API offers one relevant thing: POST /upload_media, which
 * transcribes audio into the uploads table. It takes multipart/form-data with
 * fields file, filetype, user and title — despite /api/library posting JSON to
 * it. JSON is rejected with all four fields "missing" while echoing the body
 * back, which is what a FastAPI Form parameter does when sent a JSON document.
 *
 * It answers 200 with a null body, and there is no per-upload read — GET
 * /uploads/{id} answers 405 — so the new row is found by listing and matching
 * the title we gave it.
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
  file: Blob;
  filename: string;
  filetype: string;
  user: string;
}): Promise<{ recordingId: string; title: string }> {
  const title = briefingTitle(opts.runId, opts.filename);

  const form = new FormData();
  form.append('file', opts.file, opts.filename);
  form.append('filetype', opts.filetype);
  form.append('user', opts.user);
  form.append('title', title);

  // No Content-Type header: fetch sets it with the multipart boundary.
  const res = await fetch(`${BASE}/upload_media`, {
    method: 'POST',
    headers: HEADERS,
    body: form,
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`upload_media ${res.status}: ${detail.slice(0, 200)}`);
  }

  /* The endpoint answers 200 with a null body, so the id comes from finding
     the row by title. The response is still checked first, in case it starts
     returning one. */
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
