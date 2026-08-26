/**
 * Question sets mirrored into Firestore.
 *
 *   races/{race}                 { venue, season }
 *     days/{day}                 { day, runId, kind, teamQuestions, teamPrompt, updatedAt }
 *       sailors/{name}           { questions, prompt, updatedAt }
 *
 * Team questions are one set per day, so they are fields on the day document.
 * Per-sailor sets are one-to-many, so they are a subcollection — "every sailor
 * for Sassnitz day 2" is then a single scoped read rather than a cross-collection
 * query needing a composite index.
 *
 * This is a mirror, not the source of truth: the response links still read
 * Viktor's MySQL. It matters because Firestore writes replace, while
 * /create_run only inserts — so when a resend is refused upstream, the mirror
 * still holds the set that was actually intended.
 *
 * REST rather than the SDK, for the same reason as sailorStore: the SDKs talk
 * gRPC over a long-lived stream and do not settle inside a Next request handler.
 */

const PROJECT = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const ROOT = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

type Value =
  | { stringValue: string }
  | { booleanValue: boolean }
  | { integerValue: string }
  | { arrayValue: { values: Value[] } }
  | { mapValue: { fields: Record<string, Value> } };

function toValue(v: unknown): Value {
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return { integerValue: String(Math.trunc(v)) };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toValue) } };
  if (v && typeof v === 'object') {
    return { mapValue: { fields: toFields(v as Record<string, unknown>) } };
  }
  return { stringValue: String(v ?? '') };
}

function toFields(obj: Record<string, unknown>): Record<string, Value> {
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, toValue(v)]));
}

/** PATCH with no updateMask creates the document if absent and replaces the named fields. */
async function put(path: string, fields: Record<string, unknown>) {
  const res = await fetch(`${ROOT}/${path}?key=${API_KEY}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: toFields(fields) }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Firestore PATCH ${path} ${res.status}: ${body.slice(0, 200)}`);
  }
}

export interface RunLocation {
  /** Venue, used as the race document id — e.g. "Sassnitz". */
  race: string;
  /** Race day within the event, 1-3. */
  day: string;
  season?: string;
}

/**
 * Pulls the venue and day out of a run id like "SassnitzRaceday2Season6",
 * which the console builds from venue + kicker. Anything that does not match
 * is filed under the whole run id with day "1", so a mirror still happens
 * rather than the write being dropped.
 */
export function parseRunId(runId: string): RunLocation {
  const m = runId.match(/^(.+?)Raceday(\d+)(?:Season(\d+))?$/i);
  if (!m) return { race: runId, day: '1' };
  return { race: m[1], day: m[2], season: m[3] };
}

/** Firestore ids cannot contain slashes and must not be empty. */
function docId(raw: string) {
  return raw.trim().replace(/\//g, '_') || 'unknown';
}

export interface QuestionSet {
  questions?: string[];
  prompt?: string;
}

export interface MirrorInput {
  runId: string;
  kind: string;
  scope: string;
  recipients: string[];
  teamQuestions?: string[];
  teamPrompt?: string;
  personal?: Record<string, QuestionSet>;
}

export async function mirrorQuestionSet(input: MirrorInput) {
  if (!PROJECT || !API_KEY) throw new Error('Firebase project id or API key is not configured');

  const { race, day, season } = parseRunId(input.runId);
  const raceId = docId(race);
  const dayId = docId(day);
  const updatedAt = new Date().toISOString();
  const dayPath = `races/${raceId}/days/${dayId}`;

  await put(`races/${raceId}`, { venue: race, season: season ?? '' });

  await put(dayPath, {
    day,
    runId: input.runId,
    kind: input.kind,
    scope: input.scope,
    teamQuestions: input.teamQuestions ?? [],
    teamPrompt: input.teamPrompt ?? '',
    updatedAt,
  });

  /* Only the recipients of this send. Writing every sailor in `personal`
     would resurrect sets for people who were unticked. */
  const written: string[] = [];
  await Promise.all(
    (input.recipients ?? []).map(async (name) => {
      const set = input.personal?.[name];
      const questions = set?.questions ?? input.teamQuestions ?? [];
      if (!questions.length) return;
      await put(`${dayPath}/sailors/${docId(name)}`, {
        sailor: name,
        questions,
        prompt: set?.prompt ?? input.teamPrompt ?? '',
        fromTeamSet: !set?.questions?.length,
        updatedAt,
      });
      written.push(name);
    }),
  );

  return { path: dayPath, race: raceId, day: dayId, sailors: written };
}
