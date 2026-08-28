"use client";

import { useEffect, useState } from "react";
import Briefing, {
  type Recording,
  type Stage,
  type StructuredBriefing,
} from "./Briefing";

/* ============================================================
   Example wiring. Replace local state with your own fetch/save
   and the handlers with real API calls.
   ============================================================ */

const DEFAULT_PROMPT = `Turn the briefing transcript into the record the team keeps.

Always return these two, structured:

GOALS — the squad goals as actually agreed. These may differ from what was
proposed; note what changed and why. They feed tonight's capture questions.

DECISIONS — one line each, with the owner where the transcript makes it clear.
These become action items.

Then return whatever else is worth keeping, under your own headings. Use as
many or as few as the briefing warrants. Typical ones: course and start,
warm-up, what to watch on the water, left open.

Rules:
- Use the room's own words. Do not smooth them into coaching language.
- Keep every number, threshold and time exactly as stated.
- If something was discussed but not decided, keep it under a heading that
  says so. Never manufacture a conclusion.
- Attribute a decision only if the transcript makes the owner clear.`;

/* Shape the goals agent returns, and what phase 02 files. */
interface CarriedGoal { goal?: string; evidence?: string }

export default function BriefingPage({
  runId,
}: {
  runId: string;
}) {
  const [stage, setStage] = useState<Stage>("empty");
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [recording, setRecording] = useState<Recording | null>(null);
  const [structured, setStructured] = useState<StructuredBriefing | null>(null);
  const [carriedGoals, setCarriedGoals] = useState<string[]>([]);

  /* The squad goals the coach carried in from priming. They are filed on carry
     forward rather than when first proposed, so what arrives here is what the
     coach committed, edits included. A run with nothing carried in yet answers
     404 and the panel simply stays empty. */
  useEffect(() => {
    let cancelled = false;

    fetch(`/api/priming-artifacts?runId=${encodeURIComponent(runId)}`)
      .then(async (res) => {
        if (!res.ok || cancelled) return;
        const data = await res.json().catch(() => null);
        const goals = data?.squadGoals;
        if (!Array.isArray(goals) || cancelled) return;
        setCarriedGoals(
          goals
            .map((g: CarriedGoal | string) => (typeof g === "string" ? g : g?.goal ?? ""))
            .filter(Boolean),
        );
      })
      .catch(() => undefined);

    return () => { cancelled = true; };
  }, [runId]);


  /* Upload → transcribe → structure. Each step reports its own stage so the
     coach sees where it is rather than staring at a spinner. */
  async function handleUpload(file: File) {
    setStage("uploading");

    const form = new FormData();
    form.append("audio", file);

    const upload = await fetch(`/api/sessions/${runId}/recording`, {
      method: "POST",
      body: form,
    });
    if (!upload.ok) {
      setStage("empty");
      throw new Error("Could not upload the recording");
    }
    const { recordingId } = (await upload.json()) as { recordingId: string };

    setStage("transcribing");
    const transcribe = await fetch(
      `/api/recordings/${recordingId}/transcribe`,
      { method: "POST" }
    );
    if (!transcribe.ok) {
      setStage("empty");
      throw new Error("Could not transcribe the recording");
    }
    const rec = (await transcribe.json()) as Recording;
    setRecording(rec);

    setStage("structuring");
    await runStructure(recordingId, prompt);
    setStage("done");
  }

  /* Re-runs against the saved transcript. The audio is never touched again. */
  async function runStructure(recordingId: string, withPrompt: string) {
    const res = await fetch(`/api/recordings/${recordingId}/structure`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: withPrompt }),
    });
    if (!res.ok) throw new Error("Could not structure the briefing");
    setStructured((await res.json()) as StructuredBriefing);
  }

  async function handleRestructure(withPrompt: string) {
    if (!recording) return;
    await runStructure(recording.id, withPrompt);
  }

  function handleTranscriptChange(transcript: string) {
    if (!recording) return;
    setRecording({ ...recording, transcript });
    // Debounce this in production.
    void fetch(`/api/recordings/${recording.id}/transcript`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript }),
    });
  }

  /* Goals and decisions flow on: goals into the capture questions,
     decisions into the action items, open items onto the debrief agenda. */
  async function handleSave() {
    await fetch(`/api/sessions/${runId}/briefing`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ structured, prompt }),
    });
  }

  return (
    <div style={{ background: "#F7F4ED", minHeight: "100vh", padding: 22 }}>
      <Briefing
        carriedGoals={carriedGoals}
        recording={recording}
        structured={structured}
        prompt={prompt}
        onPromptChange={setPrompt}
        onUpload={handleUpload}
        onRestructure={handleRestructure}
        onTranscriptChange={handleTranscriptChange}
        onSave={handleSave}
        stage={stage}
      />
    </div>
  );
}
