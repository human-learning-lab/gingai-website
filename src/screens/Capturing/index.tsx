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
  { id: "ric", name: "Rich", role: "Strategy & performance" },
  { id: "nic", name: "Nico", role: "Data analyst" },
];

const DEFAULT_GOALS = [
	
]



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
	SAILORS.map((s) => [s.id, { questions: [...DEFAULT_QUESTIONS], prompt: "" }]));

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
  }) {
    const res = await fetch(`/api/sessions/${runId}/capture/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: args.prompt,
        scope: args.scope,
        sailorId: args.sailor?.id,
        role: args.sailor?.role,
        squadGoals: args.squadGoals,
        ownGoal: args.ownGoal,
      }),
    });
    if (!res.ok) throw new Error("Could not generate questions");
    const { questions } = (await res.json()) as { questions: string[] };
    return questions;
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

	const link = `gingai-website.vercel.app/capturing?id=${runId}`
	/*
    recipients.forEach((sailor, i) => {
      const text = encodeURIComponent(
        `Capture while it's fresh — a few questions. Voice or text, whatever suits.\n${link}`
      );
      setTimeout(
        () => window.open(`https://wa.me/?text=${text}`, "_blank"),
        i * 400
      );
    });
  */
  }

  return (
    <div style={{ background: "#F7F4ED", minHeight: "100vh", padding: 22 }}>
      <Capture
        sailors={SAILORS}
        squadGoals={DEFAULT_GOALS}
        ownGoals={DEFAULT_GOALS}
        value={value}
        onChange={setValue}
        onGenerate={handleGenerate}
        onSend={handleSend}
        defaultQuestions={DEFAULT_QUESTIONS}
      />
    </div>
  );
}
