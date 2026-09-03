"use client";

import { useState, useEffect } from "react";
import PrimingIn, {
  type PrimingResponse,
  type Prompts,
  type Sailor,
  type SquadGoal,
  type TeamPicture,
} from "./PrimingIn";
import { teamSailors } from '@/data/roles.hll';
import { parseAgentJson } from '@/lib/agentJson';

/* ============================================================
   Example wiring. Replace local state with your own fetch/save
   and the three handlers with real API calls.
   ============================================================ */

// GingaAI agent apis
const AGENT_BASE = '/api/agent';
const SYNTH_APP_NAME = 'synthesize';

/* `distill` and `propose_goals` are deployed but not working:
     propose_goals — cannot be constructed at all. run_sse answers 404 with
       "Node name 'Propose Goals' must be a valid Python identifier", so the
       agent is defined with a space in its name.
     distill — returns {"distilled": {}} padded with several thousand spaces,
       whatever the prompt.
   Neither is in the GINGA-ai repo, so both are unpushed code on Viktor's
   machine and cannot be fixed from here. Until they are, both run through
   `report` under a directive prompt, which produces the right shapes — the
   same workaround the profile generation uses. Set the env vars once the real
   agents work and the FALLBACK_* prompts can go. */
const DIST_APP_NAME = process.env.NEXT_PUBLIC_DISTIL_AGENT ?? 'report';
const GOAL_APP_NAME = process.env.NEXT_PUBLIC_GOALS_AGENT ?? 'report';

const FALLBACK_DISTIL_FORMAT = `Ignore your usual format. Condense each sailor answer to one line.
Return ONLY JSON: {"distilled": {"SailorName": ["one line per question", ...]}}
Use the sailor names exactly as given. Keep every sailor, even where their answers are empty.`;

const FALLBACK_GOALS_FORMAT = `Ignore your usual format. Propose 2-3 squad goals from the team picture below.
Return ONLY a JSON array: [{"goal": "...", "evidence": "what would settle whether it was met"}]`;


const BASE_SAILORS: Sailor[] = [
  { id: "mar", name: "Martine", role: "Helm" },
  { id: "pau", name: "Paul G.", role: "Strategist" },
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
  "What should be the team's area of focus tomorrow?",
  "What are your uncertainties?",
  "What are your personal goals for the day?",
];

const DEFAULT_PROMPTS: Prompts = {
  distil: `Condense each answer to one line.

Rules:
- Keep the sailor's own words and emphasis. Do not translate into
  coaching language.
- Keep any number, threshold or specific moment they mentioned.
- If they raised two things, keep both. Do not pick for them.
- Never add a conclusion they didn't reach.`,

  synthesis: `Read every sailor's priming answers and produce the picture the coach
takes into the briefing.

Return:
1. Convergence — what several sailors independently raised. Give a count.
2. Divergence — where they see it differently. Do not resolve it; flag it
   for the room.
3. Individual goals by role, in each sailor's own words.
4. Uncertainties worth answering in the briefing.

Rules:
- Never speak for sailors who haven't answered.
- Use their language, not yours.
- One line per point. This is read under time pressure.`,

  squadGoals: `From the convergence above, propose 2–3 squad goals for the day.

Each goal must be:
- Specific enough to know if it happened
- Owned by the whole crew, not one role
- Measurable against something we can see in the data or the video
- Written in the crew's own language

Return the goal and, for each, the evidence that would settle whether we hit it.`,
};

export default function PrimingInPage({
  runId,
  onCarried,
}: {
  runId: string;
  /** Move on to the briefing once the priming has been carried forward. */
  onCarried?: () => void;
}) {
  const [responses, setResponses] = useState<PrimingResponse[]>([]);
  const [prompts, setPrompts] = useState<Prompts>(DEFAULT_PROMPTS);
  const [teamPicture, setTeamPicture] = useState<TeamPicture | null>(null);
  const [squadGoals, setSquadGoals] = useState<SquadGoal[]>([]);
  const [distilled, setDistilled] = useState<Record<string, string[]>>({});
  /* Unsaved work. Set by anything that changes what would be written, cleared
     by a successful save, by carrying forward, and by loading what is on file. */
  const [dirty, setDirty] = useState(false);
  const [loaded, setLoaded] = useState(false);

  /* A run already filed fills the screen, so reopening the phase does not look
     like nothing happened. Nothing on file leaves it empty, as before. */
  useEffect(() => {
    let cancelled = false;

    fetch(`/api/priming-artifacts?runId=${encodeURIComponent(runId)}`)
      .then(async (res) => {
        if (cancelled) return;
        if (!res.ok) { setLoaded(true); return; }
        const data = await res.json().catch(() => null);
        if (!data || cancelled) { setLoaded(true); return; }

        if (data.teamPicture) setTeamPicture(data.teamPicture as TeamPicture);
        if (Array.isArray(data.briefingGoals)) setSquadGoals(data.briefingGoals as SquadGoal[]);
        if (data.distilled && typeof data.distilled === "object") {
          setDistilled(data.distilled as Record<string, string[]>);
        }
        setDirty(false);
        setLoaded(true);
      })
      .catch(() => { if (!cancelled) setLoaded(true); });

    return () => { cancelled = true; };
  }, [runId]);

  /* Answers come from Viktor's API, but the questions come from Firestore.
     That API is insert-only, so its stored questions are whichever set reached
     a sailor first rather than what they were actually asked — and two sailors
     can hold different sets for the same run, which makes an answer read
     against the wrong questions misleading.

     Each sailor's own filed set first, then the day's team set, then whatever
     the API had. The last is a fallback for runs that predate the mirror, not
     a preference. */
  useEffect(() => {
    let cancelled = false;

    async function getResp() {
      const [respRes, dayRes] = await Promise.all([
        fetch(`/api/responses/${runId}?kind=priming`),
        fetch(`/api/day-questions?runId=${encodeURIComponent(runId)}&kind=priming`),
      ]);

      const resps = await respRes.json().catch(() => null);
      const day = dayRes.ok ? await dayRes.json().catch(() => null) : null;
      if (cancelled) return;

      const rows: PrimingResponse[] = Array.isArray(resps) ? resps : [];

      /* Mirror the answers into Storage as they are read. Fire and forget: the
         console must render whether or not the copy lands, and the mirror is a
         record, not something this screen reads back. */
      if (rows.length) {
        void fetch(`/api/responses/${encodeURIComponent(runId)}/mirror?kind=priming`, {
          method: "POST",
        }).catch(() => undefined);
      }

      setResponses(rows.map((row) => {
        const own = day?.sailors?.[row.recipient]?.questions as string[] | undefined;
        const questions = own?.length
          ? own
          : (day?.teamQuestions as string[] | undefined)?.length
          ? day.teamQuestions
          : row.questions;
        return { ...row, questions };
      }));
    }

    getResp().catch(() => undefined);
    return () => { cancelled = true; };
  }, [runId]);

  /* Re-condense every response. Server route keeps the model key off the client. */

  async function handleDistil(prompt: string) {
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
  /* An empty object used to pass silently: the view switched to Distilled and
     every line showed a dash. Treat it as the failure it is. */
  if (!distilled || !Object.keys(distilled).length) {
    throw new Error('The distiller returned nothing to show.');
  }
  /* Not filed here. Save changes owns the write, so the button reflects
     whether anything is actually outstanding. */
  return distilled;
  }

  async function handleSynthesise(prompt: string) {

  const responses_body = Object.fromEntries(
		responses.map((r) => [r.recipient, {questions: r.questions, responses: r.responses}]))
  const sessionId = `summarize-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const userId = 'user-1';

  await fetch(`${AGENT_BASE}/apps/${SYNTH_APP_NAME}/users/${userId}/sessions/${sessionId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });

  const res = await fetch(`${AGENT_BASE}/run_sse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify({
      appName: SYNTH_APP_NAME,
      userId,
      sessionId,
      newMessage: { role: 'user', parts: [{ text: prompt +  "Responses:\n" + JSON.stringify(responses_body)}] },
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
  const picture  = parseAgentJson<TeamPicture>(fullText);
    /* Not filed here. Like the goals, the picture is filed on carry forward —
       the point the coach commits it to the briefing. */
  setTeamPicture(picture);
  setDirty(true);
  return picture;
  }

  async function handleProposeGoals(prompt: string) {
  const sessionId = `summarize-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const userId = 'user-1';

  await fetch(`${AGENT_BASE}/apps/${GOAL_APP_NAME}/users/${userId}/sessions/${sessionId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });

  const res = await fetch(`${AGENT_BASE}/run_sse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify({
      appName: GOAL_APP_NAME,
      userId,
      sessionId,
      newMessage: {
        role: 'user',
        parts: [{
          text: (GOAL_APP_NAME === 'report' ? FALLBACK_GOALS_FORMAT + '\n\n' : '')
            + prompt + '\n\nTEAM PICTURE:\n' + JSON.stringify(teamPicture),
        }],
      },
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

    /* Not filed here. Proposed goals are a draft the coach edits — they reach
       Firestore on carry forward, which is the point the coach commits them to
       the briefing. */
    const goals = parseAgentJson<SquadGoal[]>(fullText);
    return goals;
  }

  /* Hand the picture and goals to the briefing, then navigate. */
  async function handleSave() {
    const res = await fetch('/api/priming-artifacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ runId, teamPicture, briefingGoals: squadGoals, distilled }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      throw new Error(data?.error ?? 'Could not save the priming');
    }
    setDirty(false);
  }

  async function handleCarryForward() {
    if (!teamPicture && !squadGoals.length) {
      throw new Error('Build the team picture or propose goals first.');
    }

    /* The commit point: the picture and goals are filed as the coach carries
       them into the briefing, edits included, rather than as first generated.
       Phase 03 reads them back from here, so this write is the one that has to
       land — it is awaited and its failure stops the step. Distilled answers go
       with it, so carrying forward also leaves nothing outstanding. */
    const res = await fetch('/api/priming-artifacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ runId, teamPicture, briefingGoals: squadGoals, distilled }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      throw new Error(data?.error ?? 'Could not carry the priming forward');
    }
    setDirty(false);

    /* Viktor's /priming/{runId} answers 404 — the endpoint does not exist, and
       /api/priming returns 200 with the 404 body, so this never surfaced. Kept
       so it starts working if the endpoint appears; its failure is not allowed
       to block a step whose record now lives in Firestore. */
    void fetch(`/api/priming?id=${runId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamPicture, squadGoals }),
    }).catch(() => undefined);
  }

  /* Held back until the fetch resolves, so a run already filed does not flash
     an empty screen before filling in. */
  if (!loaded) {
    return (
      <div style={{ background: "#F7F4ED", minHeight: "100%", padding: 22, color: "#8E877A", fontSize: 13 }}>
        Loading the priming…
      </div>
    );
  }

  return (
    <div className="phase-pad" style={{ background: "#F7F4ED", minHeight: "100%", padding: 22 }}>
      <PrimingIn
	  	runId={runId}
        sailors={SAILORS}
        questions={QUESTIONS}
        responses={responses}
        prompts={prompts}
        onPromptsChange={setPrompts}
        teamPicture={teamPicture}
        squadGoals={squadGoals}
        onDistil={handleDistil}
        distilled={distilled}
        onDistilledChange={(next) => { setDistilled(next); setDirty(true); }}
        dirty={dirty}
        onSave={handleSave}
        onSynthesise={handleSynthesise}
        onProposeGoals={handleProposeGoals}
        onGoalsChange={(next) => { setSquadGoals(next); setDirty(true); }}
        onCarryForward={handleCarryForward}
        onCarried={onCarried}
      />
    </div>
  );
}
