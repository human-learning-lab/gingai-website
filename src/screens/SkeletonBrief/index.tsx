"use client";

import { useState } from "react";
import { Sailor } from "@/types"
import SkeletonBrief, {
  type SkeletonBriefValue,
} from "./SkeletonBrief";

/* ============================================================
   Example wiring. Replace the local state with your own
   fetch/save, and the two handlers with real API calls.
   ============================================================ */

const SAILORS: Sailor[] = [
  { id: "mar", name: "Martine", role: "Helm" },
  { id: "pau", name: "Paul", role: "Strategist" },
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

const DEFAULT_QUESTIONS = [
  "What should be the team's area of focus tomorrow?",
  "What are your uncertainties?",
  "What are your personal goals for the day?",
];

const DEFAULT_PROMPT = `Generate priming questions for a SailGP sailor ahead of a race day.

Draw on: the forecast, expected course, boat configuration, and the action
items carried forward from the last debrief.

Rules:
- Ask what the sailor already knows. Do not teach or suggest answers.
- Three questions maximum.
- Each must be answerable in under a minute of speaking.
- Plain language. No jargon the sailor wouldn't use themselves.`;

const emptyPersonal = Object.fromEntries(
    SAILORS.map((s) => [s.name, { questions: [...DEFAULT_QUESTIONS], prompt: DEFAULT_PROMPT }])
  );

// GingaAI agent apis
const AGENT_BASE = '/api/agent';
const APP_NAME = 'generate_questions';

export default function SkeletonBriefPage({
  runId
}: {
  runId: string
}) {
  const [value, setValue] = useState<SkeletonBriefValue>({
    teamQuestions: [...DEFAULT_QUESTIONS],
	teamPrompt: DEFAULT_PROMPT,
    personal: emptyPersonal,
  });

  /* Ask the model for questions. Server route keeps the API key off the client. */
  async function handleGenerate({
    prompt,
    scope,
    sailor,
  }: {
    prompt: string;
    scope: "team" | "personal";
    sailor?: Sailor;
  }): Promise<string[]> {
  console.log(prompt);
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
  const { questions } = JSON.parse(fullText) as { questions: string[] };
  return questions;
  }

  /* Freeze the version, mint one token link per sailor, open WhatsApp. */
  async function handleSend(
	runId: string,
    recipients: string[],
    scope: "team" | "personal"
  ) {
    const res = await fetch("/api/capture-runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({runId, kind: "priming", scope, recipients, value }),
    });
    if (!res.ok) throw new Error("Could not create the capture run");

	const link = `https://gingai-website.vercel.app/priming?id=${runId}`


    /* wa.me opens WhatsApp with the message ready. One tap per sailor —
       no business account needed. Popup blockers allow the first window,
       so open them on a short stagger. 
	*/

    const text = encodeURIComponent(
    	`Priming for tomorrow — three quick questions. Voice or text, whatever suits.\n${link}`
    );
    setTimeout(() => window.open(`https://wa.me/?text=${text}`, "_blank"), i * 400);
  }

  return (
    <div style={{ background: "#F7F4ED", minHeight: "100vh", padding: 22 }}>
      <SkeletonBrief
	    runId={runId}
        sailors={SAILORS}
        value={value}
        onChange={setValue}
        onGenerate={handleGenerate}
        onSend={handleSend}
        defaultQuestions={DEFAULT_QUESTIONS}
        hasResponses={false}
      />
    </div>
  );
}
