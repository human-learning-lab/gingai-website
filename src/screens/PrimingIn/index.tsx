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
  { id: "pau", name: "Paul", role: "Strategist" },
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
  runId
}: { runId: string}
) {
  const [responses, setResponses] = useState<PrimingResponse[]>([]);
  const [prompts, setPrompts] = useState<Prompts>(DEFAULT_PROMPTS);
  const [teamPicture, setTeamPicture] = useState<TeamPicture | null>(null);
  const [squadGoals, setSquadGoals] = useState<SquadGoal[]>([]);

  useEffect(() => {
	  async function getResp(){
	  	const res = await fetch(`/api/responses/${runId}?kind=priming`);
	  	const resps = await res.json();
		console.log(resps);
	  	setResponses(resps);
	  }
	  getResp();
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
          if (typeof part.text === 'string' && part.text) fullText += part.text;
        }
      } catch { /* skip non-JSON lines */ }
    }
  }
  let distilled: Record<string, string[]>;
  try {
    distilled = JSON.parse(fullText).distilled as Record<string, string[]>;
  } catch {
    throw new Error('The distiller did not return readable JSON.');
  }
  /* An empty object used to pass silently: the view switched to Distilled and
     every line showed a dash. Treat it as the failure it is. */
  if (!distilled || !Object.keys(distilled).length) {
    throw new Error('The distiller returned nothing to show.');
  }
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
          if (typeof part.text === 'string' && part.text) fullText += part.text;
        }
      } catch { /* skip non-JSON lines */ }
    }
  }
  const picture  = JSON.parse(fullText) as TeamPicture;
  setTeamPicture(picture);
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
          if (typeof part.text === 'string' && part.text) fullText += part.text;
        }
      } catch { /* skip non-JSON lines */ }
    }
  }

	console.log(fullText);
    const goals = JSON.parse(fullText) as SquadGoal[];
    return goals;
  }

  /* Hand the picture and goals to the briefing, then navigate. */
  async function handleCarryForward() {
    await fetch(`/api/priming?id=${runId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamPicture, squadGoals }),
    });
  }

  return (
    <div style={{ background: "#F7F4ED", minHeight: "100%", padding: 22 }}>
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
        onSynthesise={handleSynthesise}
        onProposeGoals={handleProposeGoals}
        onGoalsChange={setSquadGoals}
        onCarryForward={handleCarryForward}
      />
    </div>
  );
}
