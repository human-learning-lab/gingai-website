"use client";

import { useState } from "react";
import { Sailor } from "@/types"
import SkeletonBrief, {
  type SkeletonBriefValue,
} from "./SkeletonBrief";
import { teamSailors } from '@/data/roles.hll';
import { shareBaseUrl } from '@/lib/appUrl';

/* ============================================================
   Example wiring. Replace the local state with your own
   fetch/save, and the two handlers with real API calls.
   ============================================================ */

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

/* Starts empty on purpose. Per SkeletonBriefValue, an absent entry means the
   sailor falls back to the team set; pre-filling every sailor with the
   defaults meant a team-scope edit never reached them. */
const emptyPersonal: SkeletonBriefValue["personal"] = {};

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
  /* Personal questions are written against the sailor's standing profile.
     Without one there is nothing to personalise, so fail rather than quietly
     generating the team set under their name. */
  let profile = '';
  if (scope === 'personal') {
    if (!sailor) throw new Error('Select a sailor first.');
    const res = await fetch(`/api/sailor-profile?sailor=${encodeURIComponent(sailor.name)}`);
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(data?.error ?? `No profile on file for ${sailor.name}.`);
    }
    profile = data.content as string;
  }

  const text = profile
    ? `${prompt}\n\nWrite these questions for ${sailor!.name} specifically, using their standing profile below. Draw on their own strengths, weaknesses and goals — ask about what they are actually working on, in their own language.\n\nTHEIR PROFILE:\n${profile}`
    : prompt;

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
      newMessage: { role: 'user', parts: [{ text }] },
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

	/* The deployed origin when there is one, so a link sent from alpha opens
	   alpha. On localhost it falls back to NEXT_PUBLIC_APP_URL — a localhost
	   link is not something the recipient can open. */
	const base = shareBaseUrl();

    /* In personal scope each sailor gets their own link, carrying their name.
       Without it the response page falls back to the Clerk first name of
       whoever opens it, so a forwarded link — or a second person on the same
       device — answers against someone else's questions.

       wa.me opens WhatsApp with the message ready; no business account
       needed. Popup blockers allow the first window without a gesture but
       not the rest, so the others follow on a short stagger. */
    const links = scope === "personal"
      ? recipients.map((name) => ({
          name,
          url: `${base}/priming?id=${encodeURIComponent(runId)}&sailor=${encodeURIComponent(name)}`,
        }))
      : [{ name: null, url: `${base}/priming?id=${encodeURIComponent(runId)}` }];

    links.forEach(({ name, url }, i) => {
      const text = encodeURIComponent(
        `${name ? `${name} — priming` : "Priming"} for tomorrow — three quick questions. Voice or text, whatever suits.\n${url}`,
      );
      const open = () => window.open(`https://wa.me/?text=${text}`, "_blank");
      if (i === 0) open();
      else setTimeout(open, i * 600);
    });
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
