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
async function runAgent(prompt: string): Promise<string> {
  const userId = 'report-pipeline';
  const sessionId = `report-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  await fetch(`${AGENT_BASE}/apps/${REPORT_APP}/users/${userId}/sessions/${sessionId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });

  const res = await fetch(`${AGENT_BASE}/run_sse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify({
      appName: REPORT_APP,
      userId,
      sessionId,
      streaming: false,
      newMessage: { role: 'user', parts: [{ text: prompt }] },
    }),
  });
  if (!res.ok) throw new Error(`report agent returned ${res.status}`);

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
  if (!out.trim()) throw new Error('report agent returned no text');
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
