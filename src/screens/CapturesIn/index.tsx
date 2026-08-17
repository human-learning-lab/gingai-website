"use client";

import { useState, useEffect } from "react";
import CapturesIn, {
  type CaptureResponse,
  type Prompts,
  type Sailor,
  type TeamReading,
} from "./CapturesIn";

/* ============================================================
   Example wiring. Replace local state with your own fetch/save
   and the handlers with real API calls.
   ============================================================ */

const AGENT_BASE = '/api/agent';
const APP_NAME = 'synthesize';

const SAILORS: Sailor[] = [
  { id: "mar", name: "Martine", role: "Strategist" },
  { id: "pau", name: "Paul", role: "Helm" },
  { id: "pie", name: "Pietro", role: "Speed" },
  { id: "ras", name: "Rasmus", role: "Flight controller" },
  { id: "mrc", name: "Marco", role: "Trim" },
  { id: "bre", name: "Breno", role: "Trim" },
  { id: "ric", name: "Rich", role: "Strategy & performance" },
  { id: "nic", name: "Nico", role: "Data analyst" },
  { id: "chr", name: "Christian", role: "Hulelab" },
];

const PERSONAL_GOALS: Record<string, string> = Object.fromEntries(
    SAILORS.map((s) => [s.name, ""])
  );

const DEFAULT_GOALS: string[] = [];



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
  }: {
  runId: string;
}) {
  const [responses, setResponses] = useState<CaptureResponse[]>([]);
  const [prompts, setPrompts] = useState<Prompts>(DEFAULT_PROMPTS);
  const [teamReading, setTeamReading] = useState<TeamReading | null>(null);

  useEffect(() => {
	  async function getResp(){
	  	const res = await fetch(`/api/responses/${runId}?kind=capture`);
	  	const resps = await res.json();
	  	setResponses(resps);
	  }
	  
	  getResp();
  }, [runId]);

  async function handleDistil(prompt: string) {
    const res = await fetch(`/api/captures/${runId}/distil`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
    if (!res.ok) throw new Error("Could not distil the answers");

    const { distilled } = (await res.json()) as {
      distilled: Record<string, string[]>;
    };

    setResponses((prev) =>
      prev.map((r) =>
        distilled[r.recipient] ? { ...r, distilled: distilled[r.recipient] } : r
      )
    );
    return distilled;
  }

  /* Safe to run before everyone has answered — the reading states
     its own coverage rather than speaking for the whole crew. */
async function handleSynthesise(prompt: string) {
  const sessionId = `summarize-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const userId = 'user-1';

  await fetch(`${AGENT_BASE}/apps/${APP_NAME}/users/${userId}/sessions/${sessionId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });

  const res = await fetch(`${AGENT_BASE}/run_sse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify({
      appName: APP_NAME,
      userId,
      sessionId,
      newMessage: { role: 'user', parts: [{ text: prompt }] },
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
  return picture;

  }

  async function handleCarryForward() {
    await fetch(`/api/captures/${runId}/carry-forward`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamReading }),
    });
    // router.push(`/debrief/${runId}`)
  }

  return (
    <div style={{ background: "#F7F4ED", minHeight: "100vh", padding: 22 }}>
      <CapturesIn
        sailors={SAILORS}
        responses={responses}
        squadGoals={DEFAULT_GOALS}
        ownGoals={PERSONAL_GOALS}
        prompts={prompts}
        onPromptsChange={setPrompts}
        teamReading={teamReading}
        onDistil={handleDistil}
        onSynthesise={handleSynthesise}
        onCarryForward={handleCarryForward}
      />
    </div>
  );
}
