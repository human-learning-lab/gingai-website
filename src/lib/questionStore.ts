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

/**
 * Field names for one kind of question set.
 *
 * Priming keeps the unprefixed names it has always used; capture is prefixed,
 * matching how captureDistilled and captureReading already sit beside the
 * morning's distilled and teamPicture. Without this the two kinds shared
 * teamQuestions and questions, so sending the evening's set silently replaced
 * the morning's — a different set of questions entirely.
 */
function questionFields(kind: string) {
  const evening = kind === 'capture';
  return {
    teamQuestions: evening ? 'captureTeamQuestions' : 'teamQuestions',
    teamPrompt: evening ? 'captureTeamPrompt' : 'teamPrompt',
    questions: evening ? 'captureQuestions' : 'questions',
    prompt: evening ? 'capturePrompt' : 'prompt',
    fromTeamSet: evening ? 'captureFromTeamSet' : 'fromTeamSet',
    updatedAt: evening ? 'captureQuestionsUpdatedAt' : 'updatedAt',
  };
}

export async function mirrorQuestionSet(input: MirrorInput) {
  if (!PROJECT || !API_KEY) throw new Error('Firebase project id or API key is not configured');

  const { race, day, season } = parseRunId(input.runId);
  const raceId = docId(race);
  const dayId = docId(day);
  const updatedAt = new Date().toISOString();
  const dayPath = `races/${raceId}/days/${dayId}`;

  await put(`races/${raceId}`, { venue: race, season: season ?? '' }, true);

  const F = questionFields(input.kind);

  /* Merges, so a send does not clear the team picture or squad goals already
     filed against this day — nor the other kind's question set. */
  await put(dayPath, {
    day,
    runId: input.runId,
    kind: input.kind,
    scope: input.scope,
    [F.teamQuestions]: input.teamQuestions ?? [],
    [F.teamPrompt]: input.teamPrompt ?? '',
    [F.updatedAt]: updatedAt,
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
        [F.questions]: questions,
        [F.prompt]: set?.prompt ?? input.teamPrompt ?? '',
        [F.fromTeamSet]: !set?.questions?.length,
        [F.updatedAt]: updatedAt,
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
  kind: string = 'priming',
): Promise<StoredQuestions | null> {
  if (!PROJECT || !API_KEY) return null;

  const { race, day } = parseRunId(runId);
  const dayPath = `races/${docId(race)}/days/${docId(day)}`;
  /* The kind decides which set is being answered. A capture link must not be
     served the morning's priming questions, and vice versa. */
  const F = questionFields(kind);

  if (sailor) {
    const own = await getDoc(`${dayPath}/sailors/${docId(sailor)}`);
    const questions = fromValue(own?.[F.questions]) as string[] | undefined;
    if (questions?.length) return { questions, source: 'sailor' };
  }

  const dayDoc = await getDoc(dayPath);
  const team = fromValue(dayDoc?.[F.teamQuestions]) as string[] | undefined;
  return team?.length ? { questions: team, source: 'team' } : null;
}

/* ── Phase 02 artefacts ────────────────────────────────────────
 * What priming in produces, filed against the race day it belongs to. All of
 * it merges, so redoing one step leaves the rest intact.
 *
 * Questions are not written here. They reach Firestore through
 * mirrorQuestionSet when the coach sends them, so the record is what the
 * sailors were actually asked rather than every draft along the way.
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

export interface PrimingArtifacts {
  runId: string;
  /** The synthesised team picture, shape decided by the synthesize agent. */
  teamPicture?: unknown;
  /**
   * The goals the coach carries into the briefing. Stored as `briefingGoals`:
   * they are the briefing's input. What the briefing agrees, developed from
   * these against the transcript, is filed separately as `squadGoals`.
   */
  briefingGoals?: unknown;
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
  if (input.briefingGoals !== undefined) {
    dayFields.briefingGoals = JSON.stringify(input.briefingGoals);
    written.push('briefingGoals');
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

/* ── Phase 05 artefacts ────────────────────────────────────────
 * What captures in produces, filed against the same race day. The mirror of
 * the phase 02 section above: the team reading is the day's, the distilled
 * lines are each sailor's, and every write merges so redoing one step leaves
 * the rest — and everything phases 01–03 filed — intact.
 */

export interface CaptureArtifacts {
  runId: string;
  /** The synthesised reading the coach takes into the debrief. */
  teamReading?: unknown;
  /** One condensed line per capture question, keyed by sailor. */
  distilled?: Record<string, string[]>;
}

export async function saveCaptureArtifacts(input: CaptureArtifacts) {
  if (!PROJECT || !API_KEY) throw new Error('Firebase project id or API key is not configured');

  const dayPath = await ensureDay(input.runId);
  const updatedAt = new Date().toISOString();
  const written: string[] = [];

  if (input.teamReading !== undefined) {
    // JSON for the same reason as the team picture: the shape is the agent's.
    await put(dayPath, {
      captureReading: JSON.stringify(input.teamReading),
      capturesUpdatedAt: updatedAt,
    }, true);
    written.push('teamReading');
  }

  const sailors: string[] = [];
  for (const [sailor, lines] of Object.entries(input.distilled ?? {})) {
    if (!lines?.length) continue;
    /* `captureDistilled`, not `distilled` — that field is the morning's
       priming lines, and the evening must not overwrite them. */
    await put(`${dayPath}/sailors/${docId(sailor)}`, {
      sailor,
      captureDistilled: lines,
      captureDistilledAt: updatedAt,
    }, true);
    sailors.push(sailor);
  }
  if (sailors.length) written.push(`distilled(${sailors.length})`);

  return { path: dayPath, written, sailors, updatedAt };
}

export interface StoredCaptureArtifacts {
  teamReading: unknown | null;
  distilled: Record<string, string[]>;
}

export async function readCaptureArtifacts(runId: string): Promise<StoredCaptureArtifacts | null> {
  if (!PROJECT || !API_KEY) return null;

  const { race, day } = parseRunId(runId);
  const dayPath = `races/${docId(race)}/days/${docId(day)}`;
  const dayDoc = await getDoc(dayPath);
  if (!dayDoc) return null;

  const parse = (raw: unknown) => {
    if (typeof raw !== 'string' || !raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  };

  const distilled: Record<string, string[]> = {};
  const res = await fetch(`${ROOT}/${dayPath}/sailors?key=${API_KEY}`, { cache: 'no-store' });
  if (res.ok) {
    const data = await res.json().catch(() => null) as
      { documents?: { name: string; fields?: Record<string, Record<string, unknown>> }[] } | null;
    for (const d of data?.documents ?? []) {
      const lines = fromValue(d.fields?.captureDistilled) as string[] | undefined;
      if (lines?.length) distilled[d.name.split('/').pop() ?? ''] = lines;
    }
  }

  return {
    teamReading: parse(fromValue(dayDoc.captureReading)),
    distilled,
  };
}

/* ── Phase 06 debrief ──────────────────────────────────────────
 * The hot debrief document, kept in both versions: what the model wrote and
 * what the coach made of it. Running again replaces `generated` and bumps the
 * version; the coach's edits only ever touch `edited`.
 */

export interface DebriefRecord {
  generated: string;
  edited: string;
  generatedAt: string;
  promptVersion: number;
  prompt?: string;
  sourceIds?: string[];
}

export async function saveDebrief(runId: string, record: DebriefRecord) {
  if (!PROJECT || !API_KEY) throw new Error('Firebase project id or API key is not configured');

  const dayPath = await ensureDay(runId);
  const fields: Record<string, unknown> = {
    debriefGenerated: record.generated,
    debriefEdited: record.edited,
    debriefGeneratedAt: record.generatedAt,
    debriefPromptVersion: record.promptVersion,
  };
  if (record.prompt !== undefined) fields.debriefPrompt = record.prompt;
  if (record.sourceIds !== undefined) fields.debriefSourceIds = record.sourceIds;

  await put(dayPath, fields, true);
  return { path: dayPath };
}

/** The coach's version only. The generated text stays as it was. */
export async function saveDebriefDocument(runId: string, text: string) {
  if (!PROJECT || !API_KEY) throw new Error('Firebase project id or API key is not configured');

  const dayPath = await ensureDay(runId);
  await put(dayPath, {
    debriefEdited: text,
    debriefEditedAt: new Date().toISOString(),
  }, true);
  return { path: dayPath };
}

export async function readDebrief(runId: string): Promise<DebriefRecord | null> {
  if (!PROJECT || !API_KEY) return null;

  const { race, day } = parseRunId(runId);
  const dayDoc = await getDoc(`races/${docId(race)}/days/${docId(day)}`);
  const generatedAt = fromValue(dayDoc?.debriefGeneratedAt) as string | undefined;
  if (!dayDoc || !generatedAt) return null;

  return {
    generated: (fromValue(dayDoc.debriefGenerated) as string) ?? '',
    edited: (fromValue(dayDoc.debriefEdited) as string) ?? '',
    generatedAt,
    promptVersion: (fromValue(dayDoc.debriefPromptVersion) as number) ?? 1,
    prompt: fromValue(dayDoc.debriefPrompt) as string | undefined,
    sourceIds: fromValue(dayDoc.debriefSourceIds) as string[] | undefined,
  };
}

export interface StoredPrimingArtifacts {
  teamPicture: unknown | null;
  /** The goals carried into the briefing — its input, not its outcome. */
  briefingGoals: unknown | null;
  distilled: Record<string, string[]>;
}

/**
 * What phase 02 filed for this run. The picture and goals are stored as JSON
 * strings, so they are parsed here rather than by every caller.
 */
export async function readPrimingArtifacts(runId: string): Promise<StoredPrimingArtifacts | null> {
  if (!PROJECT || !API_KEY) return null;

  const { race, day } = parseRunId(runId);
  const dayPath = `races/${docId(race)}/days/${docId(day)}`;
  const dayDoc = await getDoc(dayPath);
  if (!dayDoc) return null;

  const parse = (raw: unknown) => {
    if (typeof raw !== 'string' || !raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  };

  const distilled: Record<string, string[]> = {};
  const res = await fetch(`${ROOT}/${dayPath}/sailors?key=${API_KEY}`, { cache: 'no-store' });
  if (res.ok) {
    const data = await res.json().catch(() => null) as
      { documents?: { name: string; fields?: Record<string, Record<string, unknown>> }[] } | null;
    for (const d of data?.documents ?? []) {
      const lines = fromValue(d.fields?.distilled) as string[] | undefined;
      if (lines?.length) distilled[d.name.split('/').pop() ?? ''] = lines;
    }
  }

  return {
    teamPicture: parse(fromValue(dayDoc.teamPicture)),
    briefingGoals: parse(fromValue(dayDoc.briefingGoals)),
    distilled,
  };
}

/* ── The day's question sets ───────────────────────────────────
 * Everything filed for one race day, so the skeleton brief can reopen showing
 * what was actually sent. Only sent sets are here: mirrorQuestionSet runs on
 * the send path, never on generate, so a draft the coach discarded leaves no
 * trace.
 */

export interface DaySailorSet {
  questions: string[];
  prompt: string;
  /** True when the sailor was sent the team set rather than one of their own. */
  fromTeamSet: boolean;
}

export interface DayQuestions {
  teamQuestions: string[];
  teamPrompt: string;
  /** Keyed by sailor name. Only those who were actually sent something. */
  sailors: Record<string, DaySailorSet>;
  updatedAt?: string;
}

export async function readDayQuestions(
  runId: string,
  kind: string = 'priming',
): Promise<DayQuestions | null> {
  if (!PROJECT || !API_KEY) return null;

  const { race, day } = parseRunId(runId);
  const path = `races/${docId(race)}/days/${docId(day)}`;
  const dayDoc = await getDoc(path);
  if (!dayDoc) return null;

  const F = questionFields(kind);
  const teamQuestions = (fromValue(dayDoc[F.teamQuestions]) as string[] | undefined) ?? [];
  const teamPrompt = (fromValue(dayDoc[F.teamPrompt]) as string | undefined) ?? '';

  const sailors: Record<string, DaySailorSet> = {};
  const res = await fetch(`${ROOT}/${path}/sailors?key=${API_KEY}`, { cache: 'no-store' });
  if (res.ok) {
    const data = await res.json().catch(() => null) as
      { documents?: { name: string; fields?: Record<string, Record<string, unknown>> }[] } | null;

    for (const d of data?.documents ?? []) {
      const f = d.fields;
      const questions = (fromValue(f?.[F.questions]) as string[] | undefined) ?? [];
      if (!questions.length) continue;
      const name = (fromValue(f?.sailor) as string | undefined)
        ?? decodeURIComponent(d.name.split('/').pop() ?? '');
      sailors[name] = {
        questions,
        prompt: (fromValue(f?.[F.prompt]) as string | undefined) ?? '',
        fromTeamSet: Boolean(fromValue(f?.[F.fromTeamSet])),
      };
    }
  }

  if (!teamQuestions.length && !Object.keys(sailors).length) return null;

  return {
    teamQuestions,
    teamPrompt,
    sailors,
    updatedAt: fromValue(dayDoc.updatedAt) as string | undefined,
  };
}
