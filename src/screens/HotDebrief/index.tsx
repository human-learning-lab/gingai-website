"use client";

import { useState } from "react";
import HotDebrief, {
  type DebriefDraft,
  type DebriefSource,
} from "./HotDebrief";

/* ============================================================
   Example wiring. Replace local state with your own fetch/save
   and the handler with a real API call.
   ============================================================ */

const DEFAULT_PROMPT = `Write the hot debrief document.

Sections, in this order:

1  DEBRIEF SUMMARY
Conditions, overall tone, then each squad goal in turn — what improved,
what the primary gap was, and whether the gap is structural or execution.

2  GOAL ASSESSMENT
Each goal with one verdict: achieved, partially achieved, not achieved,
insufficient data. A note saying specifically what was and wasn't done.

3  RECURRING THEMES
A numbered table: theme, frequency out of total captures, key finding.
Count, never estimate. The key finding must be a claim, not a summary.
Order by frequency.

4  QUESTIONS ANSWERED FROM CAPTURES
Each question asked today, with what came back across the crew.

5  OVERNIGHT ACTION ITEMS
Prioritised, each with an owner. Specific enough to act on — which
footage, which race, what to compare.

6  SMALL GROUP ACTION ITEMS
Grouped by role.

FLAGS · INCONSISTENCIES & GAPS
What this document can't answer. Where sources disagree. What wasn't
asked today that should have been.

Rules:
- Use the team's own words. Do not smooth them into coaching language.
- Keep every number and threshold exactly as stated.
- Mark a hypothesis as a hypothesis. "The hypothesis is..." not "we are..."
- Where one crew member names another, write it without names and note
  that names are handled separately.
- Where the crew and the data disagree, say both. Do not reconcile them.`;

export default function HotDebriefPage({ runId }: { runId: string }) {
  /* Detail strings come from the API so the coach sees the real
     coverage — how many captures are in, which races are covered. */
  const [sources] = useState<DebriefSource[]>([
    { id: "captures", label: "Crew captures", detail: "10 of 10", enabled: true },
    { id: "booth", label: "Rich · per race", detail: "races 1–3", enabled: true },
    { id: "data", label: "Nico · per race", detail: "races 1–3", enabled: true },
    { id: "report", label: "Performance report", detail: "18 pages", enabled: true },
    { id: "goals", label: "Squad goals", detail: "from the briefing", enabled: true },
    { id: "open", label: "Left open in the brief", detail: "1 item", enabled: true },
    { id: "priming", label: "This morning's priming", detail: "10 answers", enabled: false },
  ]);

  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>(
    sources.filter((s) => s.enabled).map((s) => s.id)
  );

  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [draft, setDraft] = useState<DebriefDraft | null>(null);

  /* Keep both versions. `generated` is what the model wrote;
     `edited` is the coach's. Running again replaces `generated`
     and starts a new version rather than overwriting his work. */
  async function handleRun({
    prompt,
    sourceIds,
  }: {
    prompt: string;
    sourceIds: string[];
  }) {
    const res = await fetch(`/api/sessions/${sessionId}/debrief`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, sourceIds }),
    });
    if (!res.ok) throw new Error("Could not write the debrief");

    const { text, generatedAt, promptVersion } = (await res.json()) as {
      text: string;
      generatedAt: string;
      promptVersion: number;
    };

    setDraft({
      generated: text,
      edited: text,
      generatedAt,
      sourceIds,
      promptVersion,
    });

    return text;
  }

  function handleDocumentChange(text: string) {
    setDraft((d) => (d ? { ...d, edited: text } : d));
    // Debounce this in production.
    void fetch(`/api/sessions/${sessionId}/debrief/document`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
  }

  return (
    <div style={{ background: "#F7F4ED", minHeight: "100vh", padding: 22 }}>
      <HotDebrief
        sources={sources}
        selectedSourceIds={selectedSourceIds}
        onSelectedSourceIdsChange={setSelectedSourceIds}
        prompt={prompt}
        onPromptChange={setPrompt}
        draft={draft}
        onDocumentChange={handleDocumentChange}
        onRun={handleRun}
        onResetPrompt={() => setPrompt(DEFAULT_PROMPT)}
        onCopy={() => draft && navigator.clipboard.writeText(draft.edited)}
        onExport={() => {
          /* PDF, link, or Drive — decide when the format is settled. */
        }}
      />
    </div>
  );
}
