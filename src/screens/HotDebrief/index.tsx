"use client";

import { useEffect, useState } from "react";
import HotDebrief, {
  type DebriefDraft,
  type DebriefSource,
} from "./HotDebrief";

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

interface Section { tone?: string }

export default function HotDebriefPage({ runId }: { runId: string }) {
  /* The details are the real coverage, read from where each phase filed its
     material. Until the fetches land the list is empty rather than showing
     invented numbers — the old hardcoded "10 of 10" and "18 pages" described
     data that did not exist. Rich's and Nico's per-race feeds return as
     sources once they have somewhere to come from. */
  const [sources, setSources] = useState<DebriefSource[]>([]);
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);

  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [draft, setDraft] = useState<DebriefDraft | null>(null);
  /* Unsaved edits to the document. Cleared by a save, by a fresh run, and by
     loading what is already on file. */
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [publishState, setPublishState] = useState<{
    busy: boolean;
    message?: string | null;
    error?: boolean;
  }>({ busy: false });

  /* Files the debrief and refreshes what it feeds: the squad context file, and
     each sailor's, against what they said in today's capture. One call, because
     the three belong together — a debrief on file whose context files still
     describe yesterday is the state worth avoiding. */
  async function handlePublish() {
    const text = draft?.edited?.trim();
    if (!text) {
      setPublishState({ busy: false, message: "Nothing to file — run the prompt first.", error: true });
      return;
    }

    setPublishState({ busy: true, message: null });
    try {
      const res = await fetch(`/api/sessions/${encodeURIComponent(runId)}/debrief/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Could not file the debrief");

      /* Partial success is reported as such: the document is filed either way,
         and a sailor whose profile failed should be named rather than folded
         into a tick. */
      const parts = [`Filed to ${data.document?.path ?? "storage"}`];
      if (data.sailors?.length) parts.push(`${data.sailors.length} sailor files updated`);
      if (data.team) parts.push("team file updated");
      if (data.teamError) parts.push(`team file failed: ${data.teamError}`);
      if (data.sailorsFailed?.length) {
        parts.push(`failed: ${data.sailorsFailed.map((f: { sailor: string }) => f.sailor).join(", ")}`);
      }

      setPublishState({
        busy: false,
        message: parts.join(" · "),
        error: Boolean(data.teamError || data.sailorsFailed?.length),
      });
    } catch (e) {
      setPublishState({
        busy: false,
        message: e instanceof Error ? e.message : "Could not file the debrief",
        error: true,
      });
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [captures, briefing, captureArts, priming] = await Promise.all([
        fetch(`/api/responses/${encodeURIComponent(runId)}?kind=capture`)
          .then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch(`/api/sessions/${encodeURIComponent(runId)}/briefing`)
          .then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch(`/api/capture-artifacts?runId=${encodeURIComponent(runId)}`)
          .then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch(`/api/priming-artifacts?runId=${encodeURIComponent(runId)}`)
          .then((r) => (r.ok ? r.json() : null)).catch(() => null),
      ]);
      if (cancelled) return;

      const capturesIn = Array.isArray(captures) ? captures.length : 0;
      const goals = Array.isArray(briefing?.goals) ? briefing.goals.length : 0;
      const decisions = Array.isArray(briefing?.decisions) ? briefing.decisions.length : 0;
      const open = Array.isArray(briefing?.sections)
        ? (briefing.sections as Section[]).filter((s) => s?.tone === "open").length
        : 0;
      const hasReading = Boolean(captureArts?.teamReading);
      const primingIn = priming?.distilled ? Object.keys(priming.distilled).length : 0;

      const next: DebriefSource[] = [
        { id: "captures", label: "Crew captures", detail: capturesIn ? `${capturesIn} in` : "none in yet", enabled: capturesIn > 0 },
        { id: "reading", label: "Captures synthesis", detail: hasReading ? "carried from captures in" : "not built yet", enabled: hasReading },
        { id: "goals", label: "Squad goals", detail: goals ? `${goals} from the briefing` : "no briefing saved", enabled: goals > 0 },
        { id: "decisions", label: "Briefing decisions", detail: decisions ? `${decisions} on file` : "none on file", enabled: decisions > 0 },
        { id: "open", label: "Left open in the brief", detail: open ? `${open} item${open === 1 ? "" : "s"}` : "nothing left open", enabled: open > 0 },
        { id: "priming", label: "This morning's priming", detail: primingIn ? `${primingIn} sailors distilled` : "nothing filed", enabled: false },
      ];
      setSources(next);
      setSelectedSourceIds(next.filter((s) => s.enabled).map((s) => s.id));
    }

    load();

    /* A debrief already written for this run fills the screen, edits included,
       so reopening the phase does not look like nothing ever happened. */
    fetch(`/api/sessions/${encodeURIComponent(runId)}/debrief`)
      .then(async (res) => {
        if (!res.ok || cancelled) return;
        const data = await res.json().catch(() => null);
        if (!data?.generatedAt || cancelled) return;
        if (data.prompt) setPrompt(data.prompt);
        setDraft({
          generated: data.generated ?? "",
          edited: data.edited ?? data.generated ?? "",
          generatedAt: data.generatedAt,
          sourceIds: data.sourceIds ?? [],
          promptVersion: data.promptVersion ?? 1,
        });
        setDirty(false);
      })
      .catch(() => undefined);

    return () => { cancelled = true; };
  }, [runId]);

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
    const res = await fetch(`/api/sessions/${runId}/debrief`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, sourceIds }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      throw new Error(data?.error ?? "Could not write the debrief");
    }

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
    setDirty(true);

    return text;
  }

  function handleDocumentChange(text: string) {
    setDraft((d) => (d ? { ...d, edited: text } : d));
    setDirty(true);
  }

  /* Explicit rather than debounced. The write used to fire 800ms after the last
     keystroke as void fetch().catch(() => undefined), so a failed save was
     silent — the coach had no way to know the document had not persisted. */
  async function handleSave() {
    const text = draft?.edited;
    if (typeof text !== "string") return;

    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/sessions/${runId}/debrief/document`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Could not save the document");
      }
      setDirty(false);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Could not save the document");
    } finally {
      setSaving(false);
    }
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
        onSave={handleSave}
        saveState={{ dirty, saving, error: saveError }}
        onPublish={handlePublish}
        publishState={publishState}
        onCopy={() => draft && navigator.clipboard.writeText(draft.edited)}
        onExport={() => {
          /* PDF, link, or Drive — decide when the format is settled. */
        }}
      />
    </div>
  );
}
