"use client";

import { useState } from "react";
import Capture, {
  type CaptureValue,
  type PrimingMetric,
  type Sailor,
} from "./Capturing";

/* ============================================================
   Example wiring. Replace local state with your own fetch/save
   and the handlers with real API calls.
   ============================================================ */

const SAILORS: Sailor[] = [
  { id: "mar", name: "Martine", role: "Strategist" },
  { id: "pau", name: "Paul", role: "Helm" },
  { id: "pie", name: "Pietro", role: "Speed" },
  { id: "ras", name: "Rasmus", role: "Flight controller" },
  { id: "mrc", name: "Marco", role: "Trim" },
  { id: "bre", name: "Breno", role: "Trim" },
  { id: "mat", name: "Mateus", role: "G1"},
  { id: "jer", name: "Jeremy", role: "Performance coach"},
  { id: "ric", name: "Rich", role: "Strategy & performance" },
  { id: "nic", name: "Nico", role: "Data analyst" },
  { id: "chr", name: "Christian", role: "HuleLab" },
];

const DEFAULT_GOALS: string[] = [
	
]

const PERSONAL_GOALS: Record<string, string> = Object.fromEntries(
    SAILORS.map((s) => [s.name, ""]));




const DEFAULT_QUESTIONS = [
  "What is the main thing on your mind?",
  "Did you achieve the goal you set this morning?",
  "Where did the plan break down most clearly?",
  "What should we take into tomorrow?",
];

const DEFAULT_PROMPT = `Write post-race capture questions for one sailor.

You are given: the squad goals agreed in the briefing, this sailor's own
goal from the morning, and their role.

Rules:
- Four questions maximum. They are standing on a dock and tired.
- One must ask directly about their own goal, in their own words.
- One must ask about a squad goal — the one closest to their role.
- Ask what happened, not how they felt about it.
- Never ask "how was it". Steer them to their own area.
- Plain language. No coaching vocabulary they wouldn't use themselves.`;

const emptyPersonal = Object.fromEntries(
	SAILORS.map((s) => [s.name, { questions: [...DEFAULT_QUESTIONS], prompt: DEFAULT_PROMPT }]));

const AGENT_BASE = '/api/agent';
const APP_NAME = 'generate_questions';


export default function CapturePage({
  runId
}:{
  runId: string
}) {
  const [value, setValue] = useState<CaptureValue>({
    teamQuestions: [...DEFAULT_QUESTIONS],
	teamPrompt: DEFAULT_PROMPT,
    personal: emptyPersonal,
  });

  /* Not live yet. Wire this to Nico's feed once the per-role
     metrics are defined, then flip primingDataLive to true. */
  //const [primingData] = useState<Record<string, PrimingMetric[]>>({});

  async function handleGenerate(args: {
    prompt: string;
    scope: "team" | "personal";
    sailor?: Sailor;
    squadGoals: string[];
    ownGoal?: string;
  }): Promise<string[]> {
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
  if (!res.ok) throw new Error("Could not generate questions");

  const reader = res.body?.getReader();
  if (!reader) return [];
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
  const questions = JSON.parse(fullText) as { questions: string[] };
  return questions.questions;
  }

  /* Freeze the version, mint a token link per sailor, open WhatsApp.
     In personal scope each link carries that sailor's own set; anyone
     without one falls back to the team questions. */
  async function handleSend(
    recipients: string[],
    scope: "team" | "personal"
  ) {
    const res = await fetch(`/api/capture-runs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        runId,
        kind: "capture",
        scope,
        recipients,
        value,
      }),
    });
    if (!res.ok) throw new Error("Could not create the capture run");

	const link = `https://gingai-website.vercel.app/capturing?id=${runId}`
    const text = encodeURIComponent(
      `Capture while it's fresh — a few questions. Voice or text, whatever suits.\n${link}`
    );
    setTimeout(
      () => window.open(`https://wa.me/?text=${text}`, "_blank"),
      i * 400
    );
  }

  return (
    <div style={{ background: "#F7F4ED", minHeight: "100vh", padding: 22 }}>
      <Capture
        sailors={SAILORS}
        squadGoals={DEFAULT_GOALS}
        ownGoals={PERSONAL_GOALS}
        value={value}
        onChange={setValue}
        onGenerate={handleGenerate}
        onSend={handleSend}
        defaultQuestions={DEFAULT_QUESTIONS}
      />
    </div>
  );
}
