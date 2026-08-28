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

/**
 * Creates the document if absent, and writes the given fields.
 *
 * `merge` matters: without an updateMask, Firestore replaces the whole
 * document and silently drops every field not in the request — verified
 * against the live database. Partial writers must pass merge, or writing the
 * team picture would delete the day's questions.
 */
async function put(path: string, fields: Record<string, unknown>, merge = false) {
  const mask = merge
    ? Object.keys(fields).map(k => `&updateMask.fieldPaths=${encodeURIComponent(k)}`).join('')
    : '';
  const res = await fetch(`${ROOT}/${path}?key=${API_KEY}${mask}`, {
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

  await put(`races/${raceId}`, { venue: race, season: season ?? '' }, true);

  /* Merges, so a send does not clear the team picture or squad goals already
     filed against this day. */
  await put(dayPath, {
    day,
    runId: input.runId,
    kind: input.kind,
    scope: input.scope,
    teamQuestions: input.teamQuestions ?? [],
    teamPrompt: input.teamPrompt ?? '',
    updatedAt,
  }, true);

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
      }, true);
      written.push(name);
    }),
  );

  return { path: dayPath, race: raceId, day: dayId, sailors: written };
}

/* ── Reading back ──────────────────────────────────────────────
 * The mirror is also the delivery source now. /create_run will not replace an
 * existing set, so MySQL can hold questions that were superseded; Firestore
 * always holds the latest. Response links read here first and fall back to
 * MySQL for runs that predate the mirror.
 */

function fromValue(v: Record<string, unknown> | undefined): unknown {
  if (!v) return undefined;
  if ('stringValue' in v) return v.stringValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('arrayValue' in v) {
    const arr = (v.arrayValue as { values?: Record<string, unknown>[] })?.values ?? [];
    return arr.map(fromValue);
  }
  return undefined;
}

async function getDoc(path: string): Promise<Record<string, Record<string, unknown>> | null> {
  const res = await fetch(`${ROOT}/${path}?key=${API_KEY}`, { cache: 'no-store' });
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  return (data?.fields as Record<string, Record<string, unknown>>) ?? null;
}

export interface StoredQuestions {
  questions: string[];
  /** "sailor" when they have their own set, "team" when they fall back to it. */
  source: 'sailor' | 'team';
}

/**
 * The questions this sailor should answer for this run, or null when the run
 * has never been mirrored.
 */
export async function readQuestionSet(
  runId: string,
  sailor?: string,
): Promise<StoredQuestions | null> {
  if (!PROJECT || !API_KEY) return null;

  const { race, day } = parseRunId(runId);
  const dayPath = `races/${docId(race)}/days/${docId(day)}`;

  if (sailor) {
    const own = await getDoc(`${dayPath}/sailors/${docId(sailor)}`);
    const questions = fromValue(own?.questions) as string[] | undefined;
    if (questions?.length) return { questions, source: 'sailor' };
  }

  const dayDoc = await getDoc(dayPath);
  const team = fromValue(dayDoc?.teamQuestions) as string[] | undefined;
  return team?.length ? { questions: team, source: 'team' } : null;
}

/* ── Generated artefacts ───────────────────────────────────────
 * Everything phases 01 and 02 produce, filed against the race day it belongs
 * to. All of it merges, so regenerating one thing leaves the rest intact and a
 * coach redoing the briefing overwrites only what they redid.
 */

/** The day document, ensured to exist before a partial write lands on it. */
async function ensureDay(runId: string) {
  const { race, day, season } = parseRunId(runId);
  const raceId = docId(race);
  const dayPath = `races/${raceId}/days/${docId(day)}`;
  await put(`races/${raceId}`, { venue: race, season: season ?? '' }, true);
  await put(dayPath, { day, runId }, true);
  return dayPath;
}

/** Questions as generated, before any send. Scope decides where they land. */
export async function saveGeneratedQuestions(input: {
  runId: string;
  scope: 'team' | 'personal';
  sailor?: string;
  questions: string[];
  prompt?: string;
}) {
  if (!PROJECT || !API_KEY) throw new Error('Firebase project id or API key is not configured');
  if (!input.questions.length) return null;

  const dayPath = await ensureDay(input.runId);
  const generatedAt = new Date().toISOString();

  if (input.scope === 'personal') {
    if (!input.sailor) throw new Error('A sailor is required for personal scope');
    const path = `${dayPath}/sailors/${docId(input.sailor)}`;
    await put(path, {
      sailor: input.sailor,
      questions: input.questions,
      prompt: input.prompt ?? '',
      generatedAt,
    }, true);
    return { path, generatedAt };
  }

  await put(dayPath, {
    teamQuestions: input.questions,
    teamPrompt: input.prompt ?? '',
    generatedAt,
  }, true);
  return { path: dayPath, generatedAt };
}

export interface PrimingArtifacts {
  runId: string;
  /** The synthesised team picture, shape decided by the synthesize agent. */
  teamPicture?: unknown;
  squadGoals?: unknown;
  /** One condensed line per question, keyed by sailor. */
  distilled?: Record<string, string[]>;
}

/**
 * What phase 02 produces. Each part is optional so a coach redoing one step —
 * re-distilling without rebuilding the picture, say — does not clear the others.
 */
export async function savePrimingArtifacts(input: PrimingArtifacts) {
  if (!PROJECT || !API_KEY) throw new Error('Firebase project id or API key is not configured');

  const dayPath = await ensureDay(input.runId);
  const updatedAt = new Date().toISOString();
  const written: string[] = [];

  const dayFields: Record<string, unknown> = {};
  if (input.teamPicture !== undefined) {
    // Stored as JSON: the picture's shape is the agent's to change, and a typed
    // Firestore map would need migrating every time it does.
    dayFields.teamPicture = JSON.stringify(input.teamPicture);
    written.push('teamPicture');
  }
  if (input.squadGoals !== undefined) {
    dayFields.squadGoals = JSON.stringify(input.squadGoals);
    written.push('squadGoals');
  }
  if (Object.keys(dayFields).length) {
    await put(dayPath, { ...dayFields, primingUpdatedAt: updatedAt }, true);
  }

  const sailors: string[] = [];
  for (const [sailor, lines] of Object.entries(input.distilled ?? {})) {
    if (!lines?.length) continue;
    await put(`${dayPath}/sailors/${docId(sailor)}`, {
      sailor,
      distilled: lines,
      distilledAt: updatedAt,
    }, true);
    sailors.push(sailor);
  }
  if (sailors.length) written.push(`distilled(${sailors.length})`);

  return { path: dayPath, written, sailors, updatedAt };
}
