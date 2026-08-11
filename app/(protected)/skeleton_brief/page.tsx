"use client";

import { useState } from "react";
import SkeletonBrief, {
  type Sailor,
  type SkeletonBriefValue,
} from "@/screens/SkeletonBrief";

/* ============================================================
   Example wiring. Replace the local state with your own
   fetch/save, and the two handlers with real API calls.
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

const emptyPersonal = () =>
  Object.fromEntries(
    SAILORS.map((s) => [s.id, { questions: [...DEFAULT_QUESTIONS], prompt: "" }])
  );

export default function SkeletonBriefPage() {
  const [value, setValue] = useState<SkeletonBriefValue>({
    team: { questions: [...DEFAULT_QUESTIONS], prompt: DEFAULT_PROMPT },
    personal: {
      ...emptyPersonal(),
      ras: {
        questions: [...DEFAULT_QUESTIONS],
        prompt: `Rasmus is flight controller. He thinks in numbers, thresholds and
triggers. Ask about cant, rudder average, ride height and the specific
moments where he has to decide before he feels certain.`,
      },
      mar: {
        questions: [...DEFAULT_QUESTIONS],
        prompt: `Martine is strategist. She thinks spatially and intuitively. Ask
about the picture up the course, where the pressure is, and how she'll
communicate what she sees.`,
      },
    },
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
  }) {
    const res = await fetch("/api/questions/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, scope, sailorId: sailor?.id }),
    });
    if (!res.ok) throw new Error("Could not generate questions");
    const { questions } = (await res.json()) as { questions: string[] };
    return questions;
  }

  /* Freeze the version, mint one token link per sailor, open WhatsApp. */
  async function handleSend(
    recipients: string[],
    scope: "team" | "personal"
  ) {
    const res = await fetch("/api/capture-runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "priming", scope, recipients, value }),
    });
    if (!res.ok) throw new Error("Could not create the capture run");

    const { links } = (await res.json()) as {
      links: { sailorId: string; name: string; url: string }[];
    };

    /* wa.me opens WhatsApp with the message ready. One tap per sailor —
       no business account needed. Popup blockers allow the first window,
       so open them on a short stagger. */
    links.forEach((link, i) => {
      const text = encodeURIComponent(
        `Priming for tomorrow — three quick questions. Voice or text, whatever suits.\n${link.url}`
      );
      setTimeout(() => window.open(`https://wa.me/?text=${text}`, "_blank"), i * 400);
    });
  }

  return (
    <div style={{ background: "#F7F4ED", minHeight: "100vh", padding: 22 }}>
      <SkeletonBrief
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
