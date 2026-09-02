import { NextRequest, NextResponse } from 'next/server';
import { readBriefing } from '@/lib/briefingStore';
import {
  readCaptureArtifacts,
  readDebrief,
  readPrimingArtifacts,
  saveDebrief,
} from '@/lib/questionStore';
import { readDebriefMarkdown } from '@/lib/briefingStore';

export const runtime = 'nodejs';
export const maxDuration = 300;

const AGENT_BASE = process.env.AGENT_API_URL ?? 'https://ginga-742926686826.us-east1.run.app';
/* No dedicated debrief agent is deployed. `report` follows a directive prompt
   reliably — the same workaround the briefing structurer uses. */
const APP = process.env.DEBRIEF_AGENT_APP ?? 'report';

const VIKTOR_BASE = process.env.VIKTOR_API_URL ?? 'https://wriggly-tutu-groin.ngrok-free.dev';
const VIKTOR_HEADERS = { 'ngrok-skip-browser-warning': '1' };

const FORMAT = `Ignore your usual format. Write the document the instructions below
describe, from the source material that follows them. Return the document as plain
markdown text — no JSON, no code fences, no preamble. Where a section has no
material, say so in the section rather than inventing content.`;

/** Concatenates the text parts off the agent's SSE stream. */
async function runAgent(text: string): Promise<string> {
  const userId = 'debrief';
  const sessionId = `debrief-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  await fetch(`${AGENT_BASE}/apps/${APP}/users/${userId}/sessions/${sessionId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });

  const res = await fetch(`${AGENT_BASE}/run_sse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify({
      appName: APP,
      userId,
      sessionId,
      streaming: false,
      newMessage: { role: 'user', parts: [{ text }] },
    }),
  });
  if (!res.ok) throw new Error(`${APP} agent returned ${res.status}`);

  const raw = await res.text();
  let out = '';
  for (const line of raw.split('\n')) {
    if (!line.startsWith('data: ')) continue;
    const chunk = line.slice(6).trim();
    if (!chunk || chunk === '[DONE]') continue;
    try {
      for (const part of JSON.parse(chunk)?.content?.parts ?? []) {
        if (typeof part.text === 'string') out += part.text;
      }
    } catch { /* skip keepalives */ }
  }
  return out;
}

/** The raw captures, from the same backend the response pages write to. */
async function readCaptures(runId: string): Promise<unknown[] | null> {
  try {
    const res = await fetch(
      `${VIKTOR_BASE}/responses/${encodeURIComponent(runId)}/capture`,
      { headers: VIKTOR_HEADERS, cache: 'no-store' },
    );
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    return Array.isArray(data) ? data : null;
  } catch {
    return null;
  }
}

interface Section { heading?: string; body?: string; items?: string[]; tone?: string }

/**
 * The material each source id stands for, read from where the earlier phases
 * filed it. A selected source with nothing on file contributes a block saying
 * so, so the document never silently pretends it read something.
 */
async function gatherSources(runId: string, sourceIds: string[]) {
  const want = new Set(sourceIds);
  const blocks: string[] = [];
  const block = (title: string, body: unknown) =>
    blocks.push(`## SOURCE: ${title}\n${typeof body === 'string' ? body : JSON.stringify(body, null, 1)}`);

  const [captures, captureArts, briefing, priming] = await Promise.all([
    want.has('captures') ? readCaptures(runId) : Promise.resolve(null),
    want.has('captures') || want.has('reading')
      ? readCaptureArtifacts(runId).catch(() => null)
      : Promise.resolve(null),
    want.has('goals') || want.has('decisions') || want.has('open')
      ? readBriefing(runId).catch(() => null)
      : Promise.resolve(null),
    want.has('priming') ? readPrimingArtifacts(runId).catch(() => null) : Promise.resolve(null),
  ]);

  if (want.has('captures')) {
    if (captures?.length) block(`Crew captures (${captures.length} in)`, captures);
    else block('Crew captures', 'No captures are in yet.');
    if (captureArts?.distilled && Object.keys(captureArts.distilled).length) {
      block('Crew captures, distilled', captureArts.distilled);
    }
  }
  if (want.has('reading')) {
    if (captureArts?.teamReading) block('Captures synthesis — the team reading', captureArts.teamReading);
    else block('Captures synthesis', 'No reading has been built.');
  }
  if (want.has('goals')) {
    if (briefing?.goals?.length) block('Squad goals, as agreed in the briefing', briefing.goals);
    else block('Squad goals', 'No briefing has been saved for this run.');
  }
  if (want.has('decisions')) {
    if (briefing?.decisions?.length) block('Decisions from the briefing', briefing.decisions);
    else block('Decisions from the briefing', 'None on file.');
  }
  if (want.has('open')) {
    const open = ((briefing?.sections ?? []) as Section[]).filter((s) => s?.tone === 'open');
    if (open.length) block('Left open in the brief', open);
    else block('Left open in the brief', 'Nothing was left open.');
  }
  if (want.has('priming')) {
    const parts: Record<string, unknown> = {};
    if (priming?.teamPicture) parts.teamPicture = priming.teamPicture;
    if (priming?.distilled && Object.keys(priming.distilled).length) parts.distilled = priming.distilled;
    if (Object.keys(parts).length) block("This morning's priming", parts);
    else block("This morning's priming", 'Nothing filed.');
  }

  return blocks;
}

/**
 * GET /api/sessions/{runId}/debrief
 *
 * The saved debrief for this run, both versions. 404 when nothing has been
 * written yet, which leaves the screen on its empty state.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ runId: string }> },
) {
  try {
    const { runId } = await params;
    const record = await readDebrief(runId);
    if (!record) {
      return NextResponse.json({ error: 'No debrief saved for this run' }, { status: 404 });
    }

    /* The edited document lives in Storage now. Firestore still holds the
       generated version and the metadata, and `edited` there is what earlier
       saves wrote — kept as the fallback so a debrief filed before the move
       still opens with the coach's edits rather than the raw generation. */
    const document = await readDebriefMarkdown(runId);
    return NextResponse.json({
      ...record,
      edited: document ?? record.edited ?? record.generated ?? '',
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[sessions/debrief:GET]', msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}

/**
 * POST /api/sessions/{runId}/debrief   { prompt, sourceIds }
 *
 * Runs the coach's prompt over the selected sources — read back from where
 * phases 01–05 filed them — and files the result against the race day. The
 * screen has called this since it was written; it just never existed.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ runId: string }> },
) {
  try {
    const { runId } = await params;
    const { prompt, sourceIds } = await req.json() as { prompt?: string; sourceIds?: string[] };
    if (!prompt?.trim()) {
      return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
    }
    if (!sourceIds?.length) {
      return NextResponse.json({ error: 'Select at least one source' }, { status: 400 });
    }

    const blocks = await gatherSources(runId, sourceIds);
    const text = await runAgent(
      `${FORMAT}\n\n# INSTRUCTIONS\n${prompt}\n\n# SOURCE MATERIAL\n${blocks.join('\n\n')}`,
    );
    if (!text.trim()) {
      return NextResponse.json({ error: 'The agent returned an empty document' }, { status: 502 });
    }

    const previous = await readDebrief(runId).catch(() => null);
    const generatedAt = new Date().toISOString();
    const promptVersion = (previous?.promptVersion ?? 0) + 1;

    await saveDebrief(runId, {
      generated: text,
      /* A new run starts a new version; the coach's edits belong to the old one. */
      edited: text,
      generatedAt,
      promptVersion,
      prompt,
      sourceIds,
    });

    return NextResponse.json({ text, generatedAt, promptVersion });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[sessions/debrief:POST]', msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
