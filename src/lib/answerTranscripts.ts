/**
 * The text of what a sailor answered, mirrored into Firebase Storage.
 *
 *   team/responses/{runId}/{kind}/{sailor}/transcript.md
 *
 * Filed beside that sailor's audio for the same run, so a question's recording
 * and its transcript sit together. Storage rather than Firestore on purpose:
 * this is a document, it has no fields worth querying, and a long set of spoken
 * answers can approach Firestore's 1 MB per-document ceiling.
 *
 * Written whenever the console reads the answers, so the mirror follows the
 * source rather than needing its own trigger. Re-answering overwrites the file,
 * which is what makes a second attempt replace the first rather than accrete.
 */

const BUCKET = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
const STORAGE = 'https://firebasestorage.googleapis.com/v0/b';

function segment(raw: string) {
  return raw.trim().replace(/[^\w.-]+/g, '_') || 'unknown';
}

function objectUrl(path: string) {
  return `${STORAGE}/${BUCKET}/o/${encodeURIComponent(path)}`;
}

export function answerTranscriptPath(runId: string, kind: string, sailor: string) {
  return `team/responses/${segment(runId)}/${segment(kind)}/${segment(sailor)}/transcript.md`;
}

export interface AnswerRow {
  recipient?: string;
  questions?: string[];
  responses?: string[];
  updated_at?: string;
}

/** Question-and-answer pairs as a document, unanswered questions included. */
export function renderTranscript(runId: string, kind: string, row: AnswerRow): string {
  const questions = row.questions ?? [];
  const answers = row.responses ?? [];

  const body = questions.map((question, i) => {
    const answer = (answers[i] ?? '').trim();
    return [`## Q${i + 1}. ${question}`, '', answer || '_No answer given._'].join('\n');
  });

  return [
    `# ${row.recipient ?? 'Unknown'} — ${kind} answers`,
    '',
    `Run: ${runId}`,
    row.updated_at ? `Answered: ${row.updated_at}` : null,
    '',
    ...body,
    '',
  ].filter(l => l !== null).join('\n');
}

/** True when the row holds at least one real answer worth filing. */
export function hasAnswers(row: AnswerRow): boolean {
  return (row.responses ?? []).some(a => (a ?? '').trim().length > 0);
}

export async function saveAnswerTranscript(
  runId: string,
  kind: string,
  row: AnswerRow,
): Promise<string> {
  if (!BUCKET) throw new Error('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET is not configured');
  const sailor = row.recipient?.trim();
  if (!sailor) throw new Error('The row names no recipient');

  const path = answerTranscriptPath(runId, kind, sailor);
  const res = await fetch(
    `${STORAGE}/${BUCKET}/o?uploadType=media&name=${encodeURIComponent(path)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
      body: renderTranscript(runId, kind, row),
    },
  );
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Storage upload ${res.status}: ${detail.slice(0, 160)}`);
  }

  /* Custom metadata is discarded on upload and has to follow as a PATCH.
     Provenance is a nicety, so a failure here does not fail the save. */
  await fetch(objectUrl(path), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      metadata: { runId, kind, sailor, answeredAt: row.updated_at ?? '', mirroredAt: new Date().toISOString() },
    }),
  }).catch(() => undefined);

  return path;
}

export async function readAnswerTranscript(
  runId: string,
  kind: string,
  sailor: string,
): Promise<string | null> {
  if (!BUCKET) return null;
  const res = await fetch(`${objectUrl(answerTranscriptPath(runId, kind, sailor))}?alt=media`, {
    cache: 'no-store',
  });
  return res.ok ? res.text() : null;
}

/**
 * Mirrors every answered row for one run.
 *
 * A sailor whose write fails is named rather than aborting the rest — this runs
 * off the back of the console loading, and a mirror failure must never be
 * allowed to look like the answers themselves are missing.
 */
export async function mirrorRunTranscripts(
  runId: string,
  kind: string,
  rows: AnswerRow[],
): Promise<{ mirrored: string[]; failed: { sailor: string; error: string }[] }> {
  const mirrored: string[] = [];
  const failed: { sailor: string; error: string }[] = [];

  await Promise.all(rows.filter(hasAnswers).map(async (row) => {
    const sailor = row.recipient?.trim() ?? 'unknown';
    try {
      await saveAnswerTranscript(runId, kind, row);
      mirrored.push(sailor);
    } catch (err) {
      failed.push({ sailor, error: err instanceof Error ? err.message : 'failed' });
    }
  }));

  return { mirrored: mirrored.sort(), failed };
}
