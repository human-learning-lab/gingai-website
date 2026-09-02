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

/* The Sailor Context File structure, from the format Rich uses. Two layers:
   stable, which changes slowly and is carried forward, and living, which is
   rewritten from recent material each time.

   Duplicated here as a directive prompt because the dedicated `profile` agent
   in Agent/gingai/profile is not deployed — Cloud Run serves what was last
   pushed, and the `report` agent's own instruction is the daily format. Once
   it is deployed, set PROFILE_AGENT_APP=profile and this override can go. */
const CONTEXT_FILE_STRUCTURE = `# Stable Layer — Who I Am as a Sailor and Performer

## Background & Experience
Career arc, prior classes and campaigns, anything that shaped how they think about performance.

## Role & Technical Ownership
What the job actually is, including how it changes with crew configuration. Name the throughline across variations.

## Processing Style
How they take in what is happening and reflect afterwards — visually, by feel, by sound and comms. What kinds of question they engage with, and what makes them disengage.

## Reaction Under Pressure
What happens when they make an error: first signal, behavioural default, and the root causes their mistakes trace back to. Note any consistent bias.

## Conditions That Raise Internal Pressure
Conditions and configurations where they grip tighter — including ones they would not complain about out loud.

## What Drives Them
What makes a genuinely good day independent of the result, and what they are chasing this cycle.

# Living Layer — Current Focus & Patterns

## Current Development Areas
What is not automatic yet.

## What Good Days Look Like Right Now
What is different about the sessions where it clicks.

## Recurring Mistakes Not Yet Resolved
Mistakes showing up more than once that have not become a lesson. Name the suspected root cause where the material supports it.

## Upcoming Context Sensitivity
Conditions, gear or crew configurations coming up that they are uncertain about.

## What Works / Doesn't Work in Priming
Question shapes that get something real out of them, and shapes that shut them down. Be concrete — this section directs how their priming questions are written.`;

function buildProfilePrompt(
  sailor: string,
  role: string,
  speech: string,
  previous: string | null,
) {
  return [
    // Override: the `report` agent's own instruction is the daily format.
    'Ignore your usual daily-report format. You are maintaining this sailor\'s',
    'Sailor Context File — the standing picture that feeds their priming',
    'questions. It is read by the system and the coaching staff, so write in',
    'third person, analytical and specific. Not a daily report, not a pep talk.',
    '',
    'Reproduce exactly this structure, with these headings, in this order:',
    '',
    CONTEXT_FILE_STRUCTURE,
    '',
    'RULES',
    '- The stable layer changes slowly: carry it forward from the previous',
    '  version and revise only where new material contradicts or extends it.',
    '  The living layer is meant to move — rewrite it from recent material.',
    '- Use only what the material supports. Where a section has nothing behind',
    '  it, write one line saying so. Never invent a career history, a diagnosis',
    '  or a motivation.',
    '- If this person\'s role is "HuleLab" they are a developer, not a sailor.',
    '  Leave their file as the single line naming their job. Do not build a',
    '  profile for them.',
    '- These are session voice notes: expect a lot about the living layer and',
    '  little about background. Do not pad the stable layer to hide that.',
    '- Do not attribute a gendered pronoun unless their own words establish one.',
    '- Describe the difficulty, never the person.',
    '- Plain language, and their own vocabulary where they have one.',
    '',
    `Sailor: ${sailor}${role ? `, ${role}` : ''}`,
    '',
    previous
      ? 'CURRENT CONTEXT FILE — revise this:\n\n' + previous
      : 'No context file exists yet. Write the first one.',
    '',
    'THEIR TRANSCRIBED SPEECH (raw speech-to-text, fragmentary, oldest first):',
    speech,
  ].join('\n');
}

/**
 * Builds a context file from one sailor's interview answers and nothing else.
 *
 * regenerateProfile scans every transcript on file and folds the interview in
 * as extra material. This does not: the interview is a deliberate pass over the
 * whole structure, one question per section, and letting months of race-day
 * chatter in alongside it would dilute the very answers that were gathered to
 * be authoritative. What the sailor said, in the order the file is written.
 */
export async function profileFromInterview(
  sailor: string,
  role: string,
  material: string,
  previous: string | null,
): Promise<SailorProfile> {
  if (!material.trim()) throw new Error(`No interview answers on file for "${sailor}"`);

  const content = await runAgent(
    buildProfilePrompt(sailor, role, `FROM THEIR INTERVIEW:\n${material.trim()}`, previous),
    PROFILE_APP,
  );

  return {
    sailor,
    content,
    generatedAt: new Date().toISOString(),
    scanned: { rows: 0, totalChars: material.length, usedChars: material.length },
    revised: Boolean(previous),
  };
}

export async function regenerateProfile(
  sailor: string,
  role: string,
  previous: string | null,
  limit = 0,
  /** Extra material for this run — what they said in today's capture. Added to
   *  the transcripts rather than replacing them, and enough on its own for a
   *  sailor who has answered but has no voice notes on file. */
  extra?: string,
): Promise<SailorProfile> {
  const found = await collectTranscribed(sailor, limit);
  if (!found.rows && !extra?.trim()) {
    throw new Error(`No transcribed material found for "${sailor}"`);
  }

  const speech = [found.text, extra?.trim() ? `\n\nFROM TODAY'S CAPTURE:\n${extra.trim()}` : '']
    .filter(Boolean).join('');

  const content = await runAgent(
    buildProfilePrompt(sailor, role, speech, previous),
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

/* ── Team context file ─────────────────────────────────────────
 * Built by reading across the individual context files rather than from
 * transcripts. What it is for is the part the individual files cannot answer:
 * where the squad agrees, where it does not, and what that means for how the
 * team is briefed.
 */

const TEAM_CONTEXT_STRUCTURE = `# Stable Layer — Who We Are as a Squad

## Composition & Roles
The roles represented, and how responsibility shifts with crew configuration.

## How the Squad Communicates
How information moves on the boat — who calls what, and where the handoffs are.

## Collective Reaction Under Pressure
What the squad does when things go wrong. Where individual defaults compound rather than cancel out.

## Conditions That Raise Team Pressure
Conditions and configurations that stretch several people at once.

## What Drives the Squad
What the group is chasing, and where individual motivations pull in different directions.

# Living Layer — Current Focus & Patterns

## Shared Development Areas
What more than one sailor is working on right now.

## Where the Squad Converges
Themes several sailors independently raise. Name who, so a reader can check it.

## Where the Squad Diverges
Points where sailors describe the same thing differently, or want different things. Leave these unresolved — flagging them is the value.

## Recurring Team-Level Mistakes
Mistakes that recur across sailors rather than within one.

## Upcoming Context Sensitivity
Conditions or configurations ahead that several people are uncertain about.

## What Works / Doesn't Work in Team Priming
Question shapes that work across the squad, and where individuals need something different from the team default.`;

export interface TeamContext {
  content: string;
  generatedAt: string;
  sailors: string[];
  revised: boolean;
}

export async function generateTeamContext(
  files: { sailor: string; content: string }[],
  previous: string | null,
  /** The day's debrief, when there is one. The squad file is otherwise built
   *  only from the individual files, which cannot say what the room concluded. */
  debrief?: string,
): Promise<TeamContext> {
  if (!files.length) throw new Error('No sailor context files to read');

  const prompt = [
    'Ignore your usual daily-report format. You are maintaining the SQUAD context',
    'file for the Mubadala Brazil SailGP Team — the standing picture of the team as',
    'a group. It is read by the coaching staff, so write third person, analytical',
    'and specific. Not a daily report, not a pep talk.',
    '',
    'You are given each sailor\'s individual context file. Read across them. Your job',
    'is the part no individual file can answer: what the squad has in common, where',
    'it agrees, and where it does not.',
    '',
    'Reproduce exactly this structure, with these headings, in this order:',
    '',
    TEAM_CONTEXT_STRUCTURE,
    '',
    'RULES',
    '- Common ground first. A pattern one sailor mentions is an individual note; a',
    '  pattern two or more raise independently belongs here. Say how many.',
    '- Name sailors when attributing a theme, so a reader can check it against their',
    '  file.',
    '- Do not resolve divergence. Where sailors want different things, record both.',
    '- Use only what the files support. Where a section has nothing behind it, write',
    '  one line saying so rather than inventing a team dynamic.',
    '- Anyone whose role is "HuleLab" is not part of the sailing team — they',
    '  are developers, and their file is a line naming their job, not a sailor',
    '  profile. Ignore them entirely: no themes, no convergence, no mention.',
    '- Some files may be marked as example or synthetic data. Read them like any',
    '  other and count them in convergence, but note in one line which files were',
    '  synthetic so a reader can weigh the result.',
    '- Do not attribute a gendered pronoun to anyone unless their file establishes one.',
    '- Describe the difficulty, never the person.',
    '',
    previous
      ? 'CURRENT SQUAD CONTEXT FILE — revise this:\n\n' + previous
      : 'No squad context file exists yet. Write the first one.',
    '',
    debrief?.trim()
      ? `TODAY'S DEBRIEF — what the room concluded. Weigh it against the files:\n${debrief.trim()}\n`
      : '',
    `SAILOR CONTEXT FILES (${files.length}):`,
    ...files.map(f => `\n===== ${f.sailor} =====\n${f.content}`),
  ].filter(Boolean).join('\n');

  const content = await runAgent(prompt, PROFILE_APP);

  return {
    content,
    generatedAt: new Date().toISOString(),
    sailors: files.map(f => f.sailor),
    revised: Boolean(previous),
  };
}
