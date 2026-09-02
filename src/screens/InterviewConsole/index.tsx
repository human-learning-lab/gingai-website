"use client";

import { useCallback, useEffect, useState } from "react";
import InterviewConsole, { type InterviewAnswer, type SailorLike } from "./InterviewConsole";
import { teamSailors } from "@/data/roles.hll";
import { shareBaseUrl } from "@/lib/appUrl";
import {
  INTERVIEW_DISTIL_PROMPT,
  INTERVIEW_KIND,
  INTERVIEW_QUESTION_TEXTS,
  INTERVIEW_RUN_ID,
} from "@/data/interview";

const AGENT_BASE = "/api/agent";
const DIST_APP_NAME = process.env.NEXT_PUBLIC_DISTIL_AGENT ?? "report";

/* The distil agent is broken upstream, so this reroutes through `report` with
   the shape spelled out — the same workaround steps 2 and 5 use. */
const FALLBACK_DISTIL_FORMAT = `Ignore your usual format. Condense each sailor answer to one line.
Return ONLY JSON: {"distilled": {"SailorName": ["one line per question", ...]}}
Use the sailor names exactly as given. Keep every sailor, even where their answers are empty.`;

const BASE_SAILORS: SailorLike[] = [
  { id: "mar", name: "Martine", role: "Helm" },
  { id: "pau", name: "Paul", role: "Strategist" },
  { id: "pie", name: "Pietro", role: "Speed" },
  { id: "ras", name: "Rasmus", role: "Flight controller" },
  { id: "mrc", name: "Marco", role: "Trim" },
  { id: "bre", name: "Breno", role: "Trim" },
  { id: "mat", name: "Mateus", role: "G1" },
  { id: "mah", name: "Marina", role: "Spare Sailor" },
  { id: "jer", name: "Jeremy", role: "Performance coach" },
  { id: "ric", name: "Rich", role: "Strategy & performance" },
  { id: "nic", name: "Nico", role: "Data analyst" },
  { id: "chr", name: "Christian", role: "HuleLab" },
];

const SAILORS: SailorLike[] = teamSailors(BASE_SAILORS);

function parseAgentJson<T>(text: string): T {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = (fenced ? fenced[1] : text).trim();
  const start = body.search(/[[{]/);
  if (start < 0) throw new Error("No JSON in the response");
  return JSON.parse(body.slice(start)) as T;
}

export default function InterviewConsolePage() {
  const runId = INTERVIEW_RUN_ID;
  const [questions, setQuestions] = useState<string[]>(INTERVIEW_QUESTION_TEXTS);
  const [answers, setAnswers] = useState<InterviewAnswer[]>([]);

  const load = useCallback(async () => {
    const res = await fetch(
      `/api/responses/${encodeURIComponent(runId)}?kind=${INTERVIEW_KIND}`,
      { cache: "no-store" },
    );
    const rows = res.ok ? await res.json().catch(() => null) : null;
    setAnswers(Array.isArray(rows) ? rows : []);

    /* Mirror the answers into Storage as they are read, as steps 2 and 5 do. */
    if (Array.isArray(rows) && rows.length) {
      void fetch(`/api/responses/${encodeURIComponent(runId)}/mirror?kind=${INTERVIEW_KIND}`, {
        method: "POST",
      }).catch(() => undefined);
    }
  }, [runId]);

  useEffect(() => { void load(); }, [load]);

  /** Freezes the question set, then opens one WhatsApp message per sailor. */
  const onSend = useCallback(async (recipients: string[]) => {
    const value = {
      teamQuestions: questions,
      teamPrompt: "Fixed interview — one question per section of the context file.",
      personal: {},
    };

    const res = await fetch("/api/capture-runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ runId, kind: INTERVIEW_KIND, scope: "team", recipients, value }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      throw new Error(data?.error ?? "Could not create the interview run");
    }

    /* A bare link. There is one interview and one run, so there is nothing to
       select — the page resolves both from its own defaults, and who is
       answering from the signed-in account. Popup blockers allow the first
       window without a gesture but not the rest, hence the stagger. */
    const base = shareBaseUrl();
    const url = `${base}/interview`;
    recipients.forEach((name, i) => {
      const text = encodeURIComponent(
        `Your sailor context interview. Eleven questions, voice or text, whatever suits. It builds your profile.\n${url}`,
      );
      const open = () => window.open(`https://wa.me/?text=${text}`, "_blank");
      if (i === 0) open();
      else setTimeout(open, i * 600);
    });
  }, [questions, runId]);

  const onDistil = useCallback(async () => {
    const sessionId = `interview-distil-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const userId = "user-1";
    const body = Object.fromEntries(
      answers.map((a) => [a.recipient, { questions: a.questions, responses: a.responses }]),
    );

    await fetch(`${AGENT_BASE}/apps/${DIST_APP_NAME}/users/${userId}/sessions/${sessionId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const res = await fetch(`${AGENT_BASE}/run_sse`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
      body: JSON.stringify({
        appName: DIST_APP_NAME,
        userId,
        sessionId,
        newMessage: {
          role: "user",
          parts: [{
            text: (DIST_APP_NAME === "report" ? FALLBACK_DISTIL_FORMAT + "\n\n" : "")
              + INTERVIEW_DISTIL_PROMPT + "\n\nResponses:\n" + JSON.stringify(body),
          }],
        },
        streaming: false,
      }),
    });
    if (!res.ok) throw new Error("Could not distil the answers");

    const reader = res.body?.getReader();
    if (!reader) throw new Error("Could not read the distiller's response");
    const decoder = new TextDecoder();
    let buffer = "";
    let fullText = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const raw = line.slice(6).trim();
        if (!raw || raw === "[DONE]") continue;
        try {
          const event = JSON.parse(raw);
          for (const part of event?.content?.parts ?? []) {
            if (typeof part.text === "string" && part.text && !part.thought) fullText += part.text;
          }
        } catch { /* skip non-JSON lines */ }
      }
    }

    let distilled: Record<string, string[]>;
    try {
      distilled = parseAgentJson<{ distilled: Record<string, string[]> }>(fullText).distilled;
    } catch {
      throw new Error("The distiller did not return readable JSON.");
    }
    if (!distilled || !Object.keys(distilled).length) {
      throw new Error("The distiller returned nothing to show.");
    }

    setAnswers((prev) =>
      prev.map((a) => (distilled[a.recipient] ? { ...a, distilled: distilled[a.recipient] } : a)),
    );
  }, [answers]);

  const onGenerate = useCallback(async (sailor: string) => {
    const row = answers.find((a) => a.recipient === sailor);
    const res = await fetch("/api/interview/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sailor,
        runId,
        role: SAILORS.find((s) => s.name === sailor)?.role ?? "",
        distilled: row?.distilled,
      }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error ?? "Could not build the profile");
    return data?.path ?? "";
  }, [answers, runId]);

  return (
    <InterviewConsole
      runId={runId}
      sailors={SAILORS}
      questions={questions}
      onQuestionsChange={setQuestions}
      answers={answers}
      onSend={onSend}
      onDistil={onDistil}
      onGenerate={onGenerate}
    />
  );
}
