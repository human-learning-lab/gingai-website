/**
 * Per-sailor report pipeline.
 *
 * Pulls what a sailor said during a run out of Viktor's API, sends it to the
 * `report` ADK agent — which has existed since "More Agents" but was never
 * called from anywhere — and returns the document it writes.
 *
 * Persistence is the caller's job. Today that is Firestore under `sailor`;
 * the plan is to move the document body to Firebase Storage later and keep
 * only metadata and a pointer here.
 */

const VIKTOR_BASE = process.env.VIKTOR_API_URL ?? 'https://wriggly-tutu-groin.ngrok-free.dev';
const VIKTOR_HEADERS = { 'ngrok-skip-browser-warning': '1' };
const AGENT_BASE = process.env.AGENT_API_URL ?? 'https://ginga-742926686826.us-east1.run.app';
const REPORT_APP = 'report';
/* The dedicated `profile` agent exists in Agent/gingai/profile but is not
   deployed yet — Cloud Run serves whatever was last pushed. Until someone
   redeploys, the profile is produced by the `report` agent under a directive
   prompt, which follows the four-section format reliably. Flip this to
   'profile' after deploying and delete the override in buildProfilePrompt. */
const PROFILE_APP = process.env.PROFILE_AGENT_APP ?? 'report';

export interface SailorSources {
  priming: { questions: string[]; responses: string[] } | null;
  capture: { questions: string[]; responses: string[] } | null;
}

export interface SailorReport {
  sailor: string;
  runId: string;
  content: string;
  /** Which sources actually had answers — a report built on nothing should say so. */
  sources: { priming: boolean; capture: boolean };
  generatedAt: string;
}

async function fetchKind(runId: string, kind: 'priming' | 'capture', sailor: string) {
  const res = await fetch(
    `${VIKTOR_BASE}/responses/${runId}/${kind}/${encodeURIComponent(sailor)}`,
    { headers: VIKTOR_HEADERS, cache: 'no-store' },
  );
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  // The API answers 200 with {detail: "Question not found"} for an absent sailor.
  if (!data || data.detail || !Array.isArray(data.questions)) return null;
  return { questions: data.questions as string[], responses: (data.responses ?? []) as string[] };
}

export async function collectSources(runId: string, sailor: string): Promise<SailorSources> {
  const [priming, capture] = await Promise.all([
    fetchKind(runId, 'priming', sailor),
    fetchKind(runId, 'capture', sailor),
  ]);
  return { priming, capture };
}

/** Pairs each question with its answer so the agent sees what was actually asked. */
function renderKind(label: string, set: SailorSources['priming']) {
  if (!set) return `${label}: none recorded.`;
  const answered = set.questions
    .map((q, i) => ({ q, a: (set.responses[i] ?? '').trim() }))
    .filter(x => x.a);
  if (!answered.length) return `${label}: questions were sent but none answered.`;
  return `${label}:\n` + answered.map(x => `Q: ${x.q}\nA: ${x.a}`).join('\n\n');
}

export function buildPrompt(sailor: string, role: string, sources: SailorSources) {
  return [
    `Sailor: ${sailor}, ${role}`,
    renderKind('Their pre-brief capture (priming)', sources.priming),
    renderKind('Their post-racing capture', sources.capture),
    'Where a section has no material, say so plainly in one line rather than inventing content.',
  ].join('\n\n');
}

/** Runs the agent and concatenates the text parts off the SSE stream. */
async function runAgent(prompt: string, app: string = REPORT_APP): Promise<string> {
  const userId = 'report-pipeline';
  const sessionId = `report-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  await fetch(`${AGENT_BASE}/apps/${app}/users/${userId}/sessions/${sessionId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });

  const res = await fetch(`${AGENT_BASE}/run_sse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify({
      appName: app,
      userId,
      sessionId,
      streaming: false,
      newMessage: { role: 'user', parts: [{ text: prompt }] },
    }),
  });
  if (!res.ok) throw new Error(`${app} agent returned ${res.status}`);

  const text = await res.text();
  let out = '';
  for (const line of text.split('\n')) {
    if (!line.startsWith('data: ')) continue;
    const raw = line.slice(6).trim();
    if (!raw || raw === '[DONE]') continue;
    try {
      for (const part of JSON.parse(raw)?.content?.parts ?? []) {
        if (typeof part.text === 'string') out += part.text;
      }
    } catch { /* skip non-JSON keepalives */ }
  }
  if (!out.trim()) throw new Error(`${app} agent returned no text`);
  return out;
}

export async function generateSailorReport(
  runId: string,
  sailor: string,
  role: string,
): Promise<SailorReport> {
  const sources = await collectSources(runId, sailor);
  const content = await runAgent(buildPrompt(sailor, role, sources));
  return {
    sailor,
    runId,
    content,
    sources: {
      priming: Boolean(sources.priming?.responses?.some(r => r?.trim())),
      capture: Boolean(sources.capture?.responses?.some(r => r?.trim())),
    },
    generatedAt: new Date().toISOString(),
  };
}

/* ── Transcribed material ──────────────────────────────────────
 * A sailor's actual voice notes, as opposed to their questionnaire answers.
 *
 * Attribution here is by convention rather than by column: `captures.username`
 * is the author, but `uploads.username` is whoever pressed upload — Martine's
 * recordings are filed under Rich or Richard and identified only by the free
 * text title being her name. So uploads are matched on title. That is a
 * heuristic and should be replaced when the backend gains a sailor field.
 */

interface CaptureRow { username?: string; content?: string; created_at?: string }
interface UploadRow  { title?: string; content?: string; created_at?: string }

async function getJson<T>(path: string): Promise<T[]> {
  // These paths 307-redirect; fetch follows redirects by default.
  const res = await fetch(`${VIKTOR_BASE}${path}`, { headers: VIKTOR_HEADERS, cache: 'no-store' });
  if (!res.ok) return [];
  const data = await res.json().catch(() => null);
  return Array.isArray(data) ? data as T[] : [];
}

/**
 * Every transcribed line by or about `sailor`, oldest first.
 *
 * `limit` truncates to the last N characters, the most recent material being
 * the useful end. Pass 0 or omit it to take everything — the corpus per sailor
 * is tens of kilobytes at most, well inside the model's context.
 */
export async function collectTranscribed(sailor: string, limit = 0) {
  const name = sailor.trim().toLowerCase();
  const [captures, uploads] = await Promise.all([
    getJson<CaptureRow>('/captures/'),
    getJson<UploadRow>('/uploads/'),
  ]);

  const parts: { at: string; text: string }[] = [];

  for (const c of captures) {
    if ((c.username ?? '').trim().toLowerCase() !== name) continue;
    if (c.content?.trim()) parts.push({ at: c.created_at ?? '', text: c.content.trim() });
  }
  for (const u of uploads) {
    if (!(u.title ?? '').trim().toLowerCase().startsWith(name)) continue;
    if (u.content?.trim()) parts.push({ at: u.created_at ?? '', text: u.content.trim() });
  }

  parts.sort((a, b) => a.at.localeCompare(b.at));
  const joined = parts.map(p => p.text).join('\n\n');

  return {
    rows: parts.length,
    totalChars: joined.length,
    text: limit > 0 ? joined.slice(-limit) : joined,
  };
}

/** Rebuilds a sailor's document from their most recent transcribed speech. */
export async function regenerateFromTranscripts(
  sailor: string,
  role: string,
  limit = 0,
): Promise<SailorReport & { scanned: { rows: number; totalChars: number; usedChars: number } }> {
  const found = await collectTranscribed(sailor, limit);
  if (!found.rows) throw new Error(`No transcribed material found for "${sailor}"`);

  const prompt = [
    `Sailor: ${sailor}${role ? `, ${role}` : ''}`,
    '',
    'The following is this sailor\'s own transcribed speech — voice notes and captures,',
    'oldest first. It is raw speech-to-text, so it is fragmentary and contains errors.',
    'Build their document from what they actually say. Do not invent detail, and where a',
    'section has no material, say so plainly in one line.',
    '',
    'TRANSCRIBED SPEECH:',
    found.text,
  ].join('\n');

  const content = await runAgent(prompt);
  return {
    sailor,
    runId: 'transcripts',
    content,
    sources: { priming: false, capture: found.rows > 0 },
    generatedAt: new Date().toISOString(),
    scanned: { rows: found.rows, totalChars: found.totalChars, usedChars: found.text.length },
  };
}

/* ── Standing profile ──────────────────────────────────────────
 * The living document: who this sailor is on the water, revised as more of
 * their own words accumulate. Distinct from the daily report, which covers a
 * single session and is written to daily.md.
 */

export interface SailorProfile {
  sailor: string;
  content: string;
  generatedAt: string;
  scanned: { rows: number; totalChars: number; usedChars: number };
  /** Whether a previous profile was found and revised rather than written fresh. */
  revised: boolean;
}

function buildProfilePrompt(
  sailor: string,
  role: string,
  speech: string,
  previous: string | null,
) {
  return [
    // Override: the `report` agent's own instruction is the daily format. Once
    // the dedicated `profile` agent is deployed this paragraph can go.
    'Ignore your usual daily-report format. You are maintaining this sailor\'s',
    'standing profile. Produce exactly four sections as H2 headings, in this',
    'order: Description, Strengths, Weaknesses, Goals.',
    '',
    'Write to the sailor, not about them. Use only what the material supports —',
    'where a section has nothing behind it, say so in one line rather than',
    'inventing content. Do not attribute a pronoun to the sailor unless their',
    'own words establish one.',
    '',
    `Sailor: ${sailor}${role ? `, ${role}` : ''}`,
    '',
    previous
      ? 'CURRENT PROFILE — revise this. Keep what still holds, update what has\nchanged, and drop only what the new material contradicts.\n\n' + previous
      : 'No profile exists yet. Write the first one.',
    '',
    'THEIR TRANSCRIBED SPEECH (raw speech-to-text, fragmentary, oldest first):',
    speech,
  ].join('\n');
}

export async function regenerateProfile(
  sailor: string,
  role: string,
  previous: string | null,
  limit = 0,
): Promise<SailorProfile> {
  const found = await collectTranscribed(sailor, limit);
  if (!found.rows) throw new Error(`No transcribed material found for "${sailor}"`);

  const content = await runAgent(
    buildProfilePrompt(sailor, role, found.text, previous),
    PROFILE_APP,
  );

  return {
    sailor,
    content,
    generatedAt: new Date().toISOString(),
    scanned: { rows: found.rows, totalChars: found.totalChars, usedChars: found.text.length },
    revised: Boolean(previous),
  };
}
