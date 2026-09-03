"use client";

import { useState, useEffect } from "react";
import CapturesIn, {
  type CaptureResponse,
  type Prompts,
  type Sailor,
  type TeamReading,
  type GoalReading,
} from "./CapturesIn";
import { teamSailors } from '@/data/roles.hll';
import { fetchOwnGoals, fetchSquadGoals } from '@/lib/carriedContext';
import { parseAgentJson } from '@/lib/agentJson';

/* ============================================================
   Example wiring. Replace local state with your own fetch/save
   and the handlers with real API calls.
   ============================================================ */

const AGENT_BASE = '/api/agent';

/* Same situation as priming in: the deployed `distill` agent returns an empty
   object whatever the prompt, and no capture-reading agent exists at all, so
   both run through `report` under a directive prompt. Set the env vars once
   real agents are deployed and the FALLBACK_* blocks can go. */
const DIST_APP_NAME = process.env.NEXT_PUBLIC_DISTIL_AGENT ?? 'report';
const READING_APP_NAME = process.env.NEXT_PUBLIC_CAPTURE_READING_AGENT ?? 'report';

const FALLBACK_DISTIL_FORMAT = `Ignore your usual format. Condense each sailor answer to one line.
Return ONLY JSON: {"distilled": {"SailorName": ["one line per question", ...]}}
Use the sailor names exactly as given. Keep every sailor, even where their answers are empty.`;

/* The shape is the screen's TeamReading — coverage, goals, themes, conflict,
   tomorrow — because that is what CapturesIn renders. */
/* Goals are structured rather than one line each. Flattened, the goal, the
   verdict and the evidence arrived concatenated — "Keep the platform flat…:
   Addressed by 2. Daniel reported…" — with no way to render the reading apart
   from the goal it is about. */
const FALLBACK_READING_FORMAT = `Ignore your usual format. Return ONLY JSON in exactly this shape:
{
  "coverage": "how many answered, e.g. 5 of 8",
  "goals": [{"goal": "the squad goal, as agreed", "addressedBy": 2, "verdict": "short verdict in your own words", "quotes": [{"sailor": "who said it", "quote": "their words, quoted rather than summarised away"}]}],
  "themes": [{"text": "...", "count": 2, "sailorNames": ["..."]}],
  "conflict": "where accounts of the same moment differ — omit the field if nowhere",
  "tomorrow": ["what the crew wants carried into tomorrow"]
}`;

const BASE_SAILORS: Sailor[] = [
  { id: "mar", name: "Martine", role: "Strategist" },
  { id: "pau", name: "Paul G.", role: "Helm" },
  { id: "pie", name: "Pietro", role: "Speed" },
  { id: "ras", name: "Rasmus", role: "Flight controller" },
  { id: "mrc", name: "Marco", role: "Trim" },
  { id: "bre", name: "Breno", role: "Trim" },
  { id: "mat", name: "Mateus", role: "G1"},
  { id: "mah", name: "Marina", role: "Spare Sailor"},
  { id: "jer", name: "Jeremy", role: "Performance coach"},
  { id: "ric", name: "Rich", role: "Strategy & performance" },
  { id: "nic", name: "Nico", role: "Data analyst" },
  { id: "chr", name: "Christian", role: "HuleLab" },
];

const SAILORS: Sailor[] = teamSailors(BASE_SAILORS);

const QUESTIONS = [
  "What is the main thing on your mind?",
  "Did you achieve the goal you set this morning?",
  "Where did the plan break down most clearly?",
  "What should we take into tomorrow?",
];

const DEFAULT_PROMPTS: Prompts = {
  distil: `Condense each answer to one line per question.

Rules:
- Keep the sailor's own words and emphasis.
- Keep any number, threshold or specific moment they mentioned.
- When they assess their own goal, keep the qualifier exactly — "half",
  "mostly", "four of six". Never round it to achieved or not.
- If they raised two things, keep both.
- Never add a conclusion they didn't reach.`,

  synthesis: `Read every capture and produce what the coach takes into the debrief.

Return:
1. Each squad goal, with what the captures say about it. Count who
   addressed it. Quote the evidence, don't summarise it away.
2. What several sailors raised independently. Give a count.
3. Where accounts of the same moment differ. Do not resolve it — that
   is the most valuable twenty minutes of the debrief.
4. What they want carried into tomorrow.

Rules:
- State the coverage. Never speak for those who haven't answered.
- Use their language, not yours.
- If a sailor qualified their own performance, keep the qualifier.
- Flag anything about another person as coach-only.`,
};

export default function CapturesInPage({
  runId,
  onCarried,
}: {
  runId: string;
  /** Move on to the debrief once the reading is carried forward. */
  onCarried?: () => void;
}) {
  const [responses, setResponses] = useState<CaptureResponse[]>([]);
  const [prompts, setPrompts] = useState<Prompts>(DEFAULT_PROMPTS);
  const [teamReading, setTeamReading] = useState<TeamReading | null>(null);

  /* The goals as agreed in the briefing and each sailor's own goal from the
     morning, read back from where those phases filed them. */
  const [squadGoals, setSquadGoals] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [distilled, setDistilled] = useState<Record<string, string[]>>({});
  /* Unsaved work. Set by anything that changes what would be written, cleared
     by a successful save, by carrying forward, and by loading what is on file. */
  const [dirty, setDirty] = useState(false);
  const [ownGoals, setOwnGoals] = useState<Record<string, string>>({});

  /* Answers come from Viktor's API, but the questions come from Firestore.
     That API is insert-only, so its stored questions are whatever was sent to
     a sailor first, not what they were actually asked last — and it carries no
     record of whether a sailor got their own set or the team's. Two sailors can
     hold different questions for the same run, so reading an answer without
     knowing which set it answers is misleading. */
  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [respRes, dayRes] = await Promise.all([
        fetch(`/api/responses/${runId}?kind=capture`),
        fetch(`/api/day-questions?runId=${encodeURIComponent(runId)}&kind=capture`),
      ]);

      const resps = await respRes.json().catch(() => null);
      const day = dayRes.ok ? await dayRes.json().catch(() => null) : null;
      if (cancelled) return;

      const rows: CaptureResponse[] = Array.isArray(resps) ? resps : [];

      /* Mirror the answers into Storage as they are read, the same way step 2
         does. Fire and forget: the console must render whether or not the copy
         lands, and the mirror is a record, not something this screen reads. */
      if (rows.length) {
        void fetch(`/api/responses/${encodeURIComponent(runId)}/mirror?kind=capture`, {
          method: "POST",
        }).catch(() => undefined);
      }


      setLoaded(true);
      setResponses(rows.map((row) => {
        const filed = day?.sailors?.[row.recipient] as
          { questions?: string[]; fromTeamSet?: boolean } | undefined;

        /* A sailor with their own filed set shows it; one marked fromTeamSet
           shows the team set. Neither on file leaves the API's questions and no
           marker, rather than claiming a set we cannot vouch for. */
        if (filed?.fromTeamSet === false && filed.questions?.length) {
          return { ...row, questions: filed.questions, fromTeamSet: false };
        }
        if (filed?.fromTeamSet && day?.teamQuestions?.length) {
          return { ...row, questions: day.teamQuestions, fromTeamSet: true };
        }
        return row;
      }));
    }

    load().catch(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, [runId]);

  useEffect(() => {
    let cancelled = false;
    /* The reading is written against the goals themselves; the change notes
       belong to the briefing that produced them. */
    fetchSquadGoals(runId).then((g) => { if (!cancelled) setSquadGoals(g.map((x) => x.text)); });
    fetchOwnGoals(runId).then((g) => { if (!cancelled) setOwnGoals(g); });

    /* A reading already carried forward comes back, so reopening the phase
       shows what the debrief will read rather than an empty panel. */
    fetch(`/api/capture-artifacts?runId=${encodeURIComponent(runId)}`)
      .then(async (res) => {
        if (!res.ok || cancelled) return;
        const data = await res.json().catch(() => null);
        if (cancelled) return;
        if (data?.teamReading) setTeamReading(normaliseReading(data.teamReading));
        if (data?.distilled && typeof data.distilled === 'object') {
          setDistilled(data.distilled as Record<string, string[]>);
        }
        setDirty(false);
      })
      .catch(() => undefined);

    return () => { cancelled = true; };
  }, [runId]);


  /* Re-condense every response. Server route keeps the model key off the client. */
  async function handleDistil(prompt: string): Promise<Record<string, string[]>> {
    const sessionId = `summarize-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  	const userId = 'user-1';

	const responses_body = Object.fromEntries(
		responses.map((r) => [r.recipient, {questions: r.questions, responses: r.responses}]))

  await fetch(`${AGENT_BASE}/apps/${DIST_APP_NAME}/users/${userId}/sessions/${sessionId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });

  const res = await fetch(`${AGENT_BASE}/run_sse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify({
      appName: DIST_APP_NAME,
      userId,
      sessionId,
      newMessage: {
        role: 'user',
        parts: [{
          text: (DIST_APP_NAME === 'report' ? FALLBACK_DISTIL_FORMAT + '\n\n' : '')
            + prompt + "\n\nResponses:\n" + JSON.stringify(responses_body),
        }],
      },
      streaming: false,
    }),
  });
  if (!res.ok) throw new Error("Could not generate distillation");

  const reader = res.body?.getReader();
  if (!reader) throw new Error("Unable to generate distillation");
  const decoder = new TextDecoder();
  let buffer = '';
  let fullText = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const raw = line.slice(6).trim();
      if (!raw || raw === '[DONE]') continue;
      try {
        const event = JSON.parse(raw);
        const parts = event?.content?.parts ?? [];
        for (const part of parts) {
          if (typeof part.text === 'string' && part.text && !part.thought) fullText += part.text;
        }
      } catch { /* skip non-JSON lines */ }
    }
  }
  let distilled: Record<string, string[]>;
  try {
    distilled = parseAgentJson<{ distilled: Record<string, string[]> }>(fullText).distilled;
  } catch {
    throw new Error('The distiller did not return readable JSON.');
  }
  /* An empty object is the distiller failing, not a result. */
  if (!distilled || !Object.keys(distilled).length) {
    throw new Error('The distiller returned nothing to show.');
  }
  /* Not filed here. Save changes owns the write, so the button reflects
     whether anything is actually outstanding. */
  return distilled;
  }

  /* Safe to run before everyone has answered — the reading states
     its own coverage rather than speaking for the whole crew. */
async function handleSynthesise(prompt: string) {
  const sessionId = `summarize-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const userId = 'user-1';

  /* The prompt alone told the agent to read captures it was never given. The
     reading is written from the actual responses and the squad goals they are
     read against. */
  const responses_body = Object.fromEntries(
    responses.map((r) => [r.recipient, { questions: r.questions, responses: r.responses }]));
  const text =
    (READING_APP_NAME === 'report' ? FALLBACK_READING_FORMAT + '\n\n' : '')
    + prompt
    + (squadGoals.length ? '\n\nSquad goals from the briefing:\n' + squadGoals.map((g) => `- ${g}`).join('\n') : '')
    + '\n\nResponses:\n' + JSON.stringify(responses_body);

  await fetch(`${AGENT_BASE}/apps/${READING_APP_NAME}/users/${userId}/sessions/${sessionId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });

  const res = await fetch(`${AGENT_BASE}/run_sse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify({
      appName: READING_APP_NAME,
      userId,
      sessionId,
      newMessage: { role: 'user', parts: [{ text }] },
      streaming: false,
    }),
  });
  if (!res.ok) throw new Error("Could not generate synthesis");

  const reader = res.body?.getReader();
  if (!reader) throw new Error("Unable to generate synthesis");
  const decoder = new TextDecoder();
  let buffer = '';
  let fullText = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const raw = line.slice(6).trim();
      if (!raw || raw === '[DONE]') continue;
      try {
        const event = JSON.parse(raw);
        const parts = event?.content?.parts ?? [];
        for (const part of parts) {
          if (typeof part.text === 'string' && part.text && !part.thought) fullText += part.text;
        }
      } catch { /* skip non-JSON lines */ }
    }
  }
  const picture  = parseAgentJson<TeamReading>(fullText);
  /* Held in state so carry forward has something to commit — the old handler
     posted `teamReading`, which nothing ever set, so it always sent null. */
  setTeamReading(normaliseReading(picture));
  setDirty(true);
  return picture;

  }

  /* The commit point: the reading is filed as the coach carries it into the
     debrief, which reads it back from here — so this write has to land. The
     old call went to /api/captures/{runId}/carry-forward, which never
     existed, and its result was not checked, so every carry 404'd silently. */
  /* Writes whatever is current. The same call carry forward makes, so the two
     cannot file different things. */
  async function persist() {
    const res = await fetch('/api/capture-artifacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ runId, teamReading, distilled }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      throw new Error(data?.error ?? 'Could not save the captures');
    }
    setDirty(false);
  }

  async function handleSave() {
    if (!teamReading && !Object.keys(distilled).length) {
      throw new Error('Nothing to save yet.');
    }
    await persist();
  }

  async function handleCarryForward() {
    if (!teamReading) {
      throw new Error('Build the team reading first.');
    }
    /* The distilled lines go with it, so carrying forward leaves nothing
       outstanding either. */
    await persist();
  }

  /* Held back until the answers and the day's filed sets resolve, so the screen
     does not show "0 answers in" for a run that has them. */
  if (!loaded) {
    return (
      <div style={{ background: "#F7F4ED", minHeight: "100%", padding: 22, color: "#8E877A", fontSize: 13 }}>
        Loading the captures…
      </div>
    );
  }

  return (
    <div className="phase-pad" style={{ background: "#F7F4ED", minHeight: "100%", padding: 22 }}>
      <CapturesIn
        runId={runId}
        sailors={SAILORS}
        responses={responses}
        squadGoals={squadGoals}
        ownGoals={ownGoals}
        prompts={prompts}
        onPromptsChange={setPrompts}
        teamReading={teamReading}
        onDistil={handleDistil}
        distilled={distilled}
        onDistilledChange={(next) => { setDistilled(next); setDirty(true); }}
        dirty={dirty}
        onSave={handleSave}
        onCarried={onCarried}
        onSynthesise={handleSynthesise}
        onCarryForward={handleCarryForward}
      />
    </div>
  );
}

/* A reading filed before goals were structured is one string per goal, with the
   goal and the verdict run together. Split on the first colon so an existing
   reading still renders in two parts rather than as a wall of text. */
function normaliseReading(raw: unknown): TeamReading | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Omit<TeamReading, 'goals'> & { goals?: unknown[] };

  const goals: GoalReading[] = (r.goals ?? []).map((g): GoalReading => {
    if (typeof g === 'string') {
      /* One string per goal, with the goal and the verdict run together.
         Split on the first colon so it still renders in two parts. */
      const at = g.indexOf(':');
      return at > 0
        ? { goal: g.slice(0, at).trim(), addressedBy: 0, verdict: '', detail: g.slice(at + 1).trim() }
        : { goal: '', addressedBy: 0, verdict: '', detail: g };
    }
    const o = (g ?? {}) as Partial<GoalReading>;
    return {
      goal: o.goal ?? '',
      addressedBy: o.addressedBy ?? 0,
      verdict: o.verdict ?? '',
      detail: o.detail ?? '',
      quotes: Array.isArray(o.quotes)
        ? o.quotes
            .map((q) => ({ sailor: q?.sailor ?? '', quote: q?.quote ?? '' }))
            .filter((q) => q.quote)
        : undefined,
    };
  });

  return { ...r, goals };
}
