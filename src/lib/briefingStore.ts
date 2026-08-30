/**
 * The briefing record, split by what each store is good at.
 *
 *   Firebase Storage   team/briefings/{runId}/transcript.md
 *   Firestore          races/{race}/days/{day}  briefing* fields
 *
 * The transcript is long prose with no queryable structure, so it belongs in a
 * bucket — a Firestore document caps at 1 MB and a room recording can pass
 * that. What the model pulled out of it is short and belongs next to the rest
 * of the day, so it goes in Firestore with the questions, team picture and
 * goals.
 */

import { parseRunId } from './questionStore';

const BUCKET = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
const STORAGE = 'https://firebasestorage.googleapis.com/v0/b';

const PROJECT = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const FIRESTORE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

/* ── Transcript, in Storage ────────────────────────────────── */

function objectUrl(path: string) {
  return `${STORAGE}/${BUCKET}/o/${encodeURIComponent(path)}`;
}

function transcriptPath(runId: string) {
  return `team/briefings/${runId.replace(/[^\w.-]+/g, '_')}/transcript.md`;
}

export async function saveTranscript(runId: string, transcript: string): Promise<string | null> {
  if (!BUCKET || !transcript.trim()) return null;
  const path = transcriptPath(runId);

  const res = await fetch(
    `${STORAGE}/${BUCKET}/o?uploadType=media&name=${encodeURIComponent(path)}`,
    { method: 'POST', headers: { 'Content-Type': 'text/markdown; charset=utf-8' }, body: transcript },
  );
  if (!res.ok) throw new Error(`Storage upload ${res.status}`);

  /* Custom metadata is discarded on upload and has to follow as a PATCH.
     Provenance is a nicety, so a failure here does not fail the save. */
  await fetch(objectUrl(path), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ metadata: { runId, kind: 'briefing-transcript' } }),
  }).catch(() => undefined);

  return path;
}

export async function readTranscript(runId: string): Promise<string | null> {
  if (!BUCKET) return null;
  const path = transcriptPath(runId);

  // The metadata call carries the download token the media fetch needs.
  const metaRes = await fetch(objectUrl(path), { cache: 'no-store' });
  if (!metaRes.ok) return null;
  const meta = await metaRes.json().catch(() => null) as { downloadTokens?: string } | null;
  const token = meta?.downloadTokens?.split(',')[0];
  if (!token) return null;

  const res = await fetch(`${objectUrl(path)}?alt=media&token=${token}`, { cache: 'no-store' });
  return res.ok ? res.text() : null;
}

/* ── Structured briefing, in Firestore ─────────────────────── */

function dayPath(runId: string) {
  const { race, day } = parseRunId(runId);
  const id = (s: string) => s.trim().replace(/\//g, '_') || 'unknown';
  return `races/${id(race)}/days/${id(day)}`;
}

export interface BriefingRecord {
  goals: unknown[];
  decisions: unknown[];
  sections: unknown[];
  prompt?: string;
  recordingId?: string;
  filename?: string;
  transcriptPath?: string;
  updatedAt?: string;
}

export async function saveBriefing(runId: string, record: BriefingRecord) {
  if (!PROJECT || !API_KEY) throw new Error('Firebase project id or API key is not configured');

  const fields: Record<string, { stringValue: string }> = {
    // Stored as JSON: the shapes belong to the agent, and a typed Firestore
    // map would need migrating every time one changes.
    briefingGoals: { stringValue: JSON.stringify(record.goals ?? []) },
    briefingDecisions: { stringValue: JSON.stringify(record.decisions ?? []) },
    briefingSections: { stringValue: JSON.stringify(record.sections ?? []) },
    briefingUpdatedAt: { stringValue: record.updatedAt ?? new Date().toISOString() },
  };
  if (record.prompt !== undefined) fields.briefingPrompt = { stringValue: record.prompt };
  if (record.recordingId) fields.briefingRecordingId = { stringValue: record.recordingId };
  if (record.filename) fields.briefingFilename = { stringValue: record.filename };
  if (record.transcriptPath) fields.briefingTranscriptPath = { stringValue: record.transcriptPath };

  /* updateMask, or Firestore drops every field not named here — which would
     take the day's questions, team picture and goals with it. */
  const mask = Object.keys(fields)
    .map(k => `&updateMask.fieldPaths=${encodeURIComponent(k)}`)
    .join('');

  const res = await fetch(`${FIRESTORE}/${dayPath(runId)}?key=${API_KEY}${mask}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Firestore ${res.status}: ${detail.slice(0, 200)}`);
  }
  return { path: dayPath(runId) };
}

export async function readBriefing(runId: string): Promise<BriefingRecord | null> {
  if (!PROJECT || !API_KEY) return null;

  const res = await fetch(`${FIRESTORE}/${dayPath(runId)}?key=${API_KEY}`, { cache: 'no-store' });
  if (!res.ok) return null;
  const data = await res.json().catch(() => null) as
    { fields?: Record<string, { stringValue?: string }> } | null;
  const f = data?.fields;
  if (!f?.briefingUpdatedAt) return null;

  const parse = (raw?: string) => {
    if (!raw) return [];
    try {
      const v = JSON.parse(raw);
      return Array.isArray(v) ? v : [];
    } catch { return []; }
  };

  return {
    goals: parse(f.briefingGoals?.stringValue),
    decisions: parse(f.briefingDecisions?.stringValue),
    sections: parse(f.briefingSections?.stringValue),
    prompt: f.briefingPrompt?.stringValue,
    recordingId: f.briefingRecordingId?.stringValue,
    filename: f.briefingFilename?.stringValue,
    transcriptPath: f.briefingTranscriptPath?.stringValue,
    updatedAt: f.briefingUpdatedAt?.stringValue,
  };
}
