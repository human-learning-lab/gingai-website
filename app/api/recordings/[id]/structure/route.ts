import { NextRequest, NextResponse } from 'next/server';
import { readRecording } from '@/lib/briefingApi';
import { readPrimingArtifacts } from '@/lib/questionStore';

export const runtime = 'nodejs';
export const maxDuration = 300;

const AGENT_BASE = process.env.AGENT_API_URL ?? 'https://ginga-742926686826.us-east1.run.app';
/* No dedicated briefing agent is deployed. `report` follows a directive prompt
   reliably, as it does for the profile and the distiller. Point this at a real
   one when it exists and the format block below can go. */
const APP = process.env.BRIEFING_AGENT_APP ?? 'report';

const FORMAT = `Ignore your usual format. Return ONLY JSON in exactly this shape:
{
  "goals": [{"goal": "...", "evidence": "what would settle whether it was met"}],
  "decisions": [{"text": "...", "owner": "name, only if the transcript makes it clear"}],
  "sections": [{"heading": "...", "body": "...", "items": ["..."], "tone": "default" | "open"}]
}
Use tone "open" for anything discussed but not decided, so nothing reads as a
conclusion. Omit owner where the transcript does not make it clear. Sections are
yours to choose — use as many or as few as the briefing warrants.`;

/** Concatenates the text parts off the agent's SSE stream. */
async function runAgent(text: string): Promise<string> {
  const userId = 'briefing';
  const sessionId = `briefing-${Date.now()}-${Math.random().toString(36).slice(2)}`;

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

/**
 * POST /api/recordings/{id}/structure   { prompt, runId?, carriedGoals? }
 *
 * Runs the coach's prompt over the saved transcript and returns the structured
 * briefing. Re-running never touches the audio — the transcript is read back
 * from the upload, which is what lets the screen restructure with an edited
 * prompt.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { prompt, runId, carriedGoals } = await req.json();
    if (!prompt?.trim()) {
      return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
    }

    const recording = await readRecording(id);
    if (!recording?.transcript.trim()) {
      return NextResponse.json({ error: `No transcript for recording ${id}` }, { status: 404 });
    }

    /* The proposed goals give the model something to reconcile against. The
       coach's prompt asks for the goals "as actually agreed... note what
       changed and why", which is unanswerable from the transcript alone —
       a room that refines a goal rarely restates it from scratch, so goals
       came back empty.

       Read from Firestore rather than taken from the caller: they were filed
       as briefingGoals when the coach carried the priming forward, so the
       source of truth is there and a restructure does not depend on the screen
       still holding them. `carriedGoals` from the body is a fallback, and the
       runId is optional so a recording outside a race day still structures. */
    let proposedGoals: string[] = [];
    if (runId) {
      const filed = await readPrimingArtifacts(runId);
      const goals = filed?.briefingGoals;
      if (Array.isArray(goals)) {
        proposedGoals = goals
          .map((g: unknown) =>
            typeof g === 'string' ? g : (g as { goal?: string })?.goal ?? '')
          .filter(Boolean);
      }
    }
    /* briefingGoals is what the coach carried into the briefing. The agreed
       goals this step produces are filed separately as squadGoals, so a
       restructure still works from the proposal rather than from its own last
       answer. */
    if (!proposedGoals.length && Array.isArray(carriedGoals)) {
      proposedGoals = carriedGoals.filter((g: unknown): g is string => typeof g === 'string' && !!g);
    }

    const proposed = proposedGoals.length
      ? `GOALS CARRIED INTO THIS BRIEFING\n` +
        proposedGoals.map(g => `- ${g}`).join('\n') +
        `\n\nWork the goals out from these against the transcript. For each one, ` +
        `decide from what the room actually said whether it was kept as is, ` +
        `reworded, narrowed, merged with another, or dropped — and say which in ` +
        `the evidence. Add a goal the room raised that is not in the list. Drop ` +
        `one the room rejected. Where the transcript does not touch a carried ` +
        `goal at all, keep it and say it went unaddressed rather than inventing ` +
        `agreement.\n\n`
      : '';

    const out = await runAgent(
      `${FORMAT}\n\n${prompt}\n\n${proposed}BRIEFING TRANSCRIPT:\n${recording.transcript}`,
    );

    // Models fence JSON often enough that stripping it beats failing on it.
    const cleaned = out.trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/, '');
    let structured: unknown;
    try {
      structured = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        { error: 'The briefing came back in a shape we could not read.' },
        { status: 502 },
      );
    }

    const s = structured as Record<string, unknown>;
    return NextResponse.json({
      goals: Array.isArray(s.goals) ? s.goals : [],
      decisions: Array.isArray(s.decisions) ? s.decisions : [],
      sections: Array.isArray(s.sections) ? s.sections : [],
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[recordings/structure]', msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
