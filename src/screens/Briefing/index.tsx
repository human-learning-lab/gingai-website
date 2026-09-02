"use client";

import { useEffect, useState } from "react";
import { compressAudioFile, uploadBriefingAudio } from "@/lib/briefingAudio";
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
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  /* Unsaved work. Set by anything that changes what would be written — a new
     recording, a restructure, an edited transcript or prompt — and cleared by
     a successful save or by loading what is already on file. */
  const [dirty, setDirty] = useState(false);

  /* A briefing already filed for this run fills the screen, so reopening the
     phase does not look like nothing ever happened. Nothing on file leaves the
     stage empty and the upload prompt showing, which is the same first-run
     behaviour as before. */
  useEffect(() => {
    let cancelled = false;

    fetch(`/api/sessions/${runId}/briefing`)
      .then(async (res) => {
        if (cancelled) return;
        if (!res.ok) { setLoaded(true); return; }
        const data = await res.json().catch(() => null);
        if (!data || cancelled) { setLoaded(true); return; }

        if (data.transcript || data.recordingId) {
          setRecording({
            id: data.recordingId ?? "",
            filename: data.filename ?? "briefing recording",
            duration: "—",
            recordedAt: data.updatedAt
              ? new Date(data.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              : "—",
            transcript: data.transcript ?? "",
          });
        }
        if (data.prompt) setPrompt(data.prompt);
        setStructured({
          goals: data.goals ?? [],
          decisions: data.decisions ?? [],
          sections: data.sections ?? [],
        });
        setStage("done");
        /* Loaded from file, so nothing is outstanding. */
        setDirty(false);
        setLoaded(true);
      })
      .catch(() => { if (!cancelled) setLoaded(true); });

    return () => { cancelled = true; };
  }, [runId]);

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
        const goals = data?.briefingGoals;
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
    setUploadError(null);
    try {
      await runUpload(file);
    } catch (e) {
      /* Briefing calls this as `void onUpload(file)`, so a rejection was an
         unhandled one: the screen flashed through the stages and dropped back
         to the upload prompt saying nothing. */
      setUploadError(e instanceof Error ? e.message : "Could not process the recording");
      setStage("empty");
    }
  }

  async function runUpload(file: File) {
    setStage("uploading");

    /* Keep our own copy. The recording goes to the transcription service and is
       not retained anywhere we control, so without this the only record of what
       the room actually said is whatever the transcript got right.

       Started here and not awaited: transcription is the thing the coach is
       waiting on, and archiving must never be what holds it up or what fails
       it. A failure is logged, not raised. */
    void (async () => {
      try {
        const { blob } = await compressAudioFile(file);
        await uploadBriefingAudio(runId, blob, file.name);
      } catch (e) {
        console.error("[briefing] could not archive the recording", e);
      }
    })();

    const form = new FormData();
    form.append("audio", file);

    const upload = await fetch(`/api/sessions/${runId}/recording`, {
      method: "POST",
      body: form,
    });
    if (!upload.ok) {
      const data = await upload.json().catch(() => null);
      setStage("empty");
      throw new Error(data?.error ?? "Could not upload the recording");
    }
    const { recordingId } = (await upload.json()) as { recordingId: string };

    setStage("transcribing");
    const transcribe = await fetch(
      `/api/recordings/${recordingId}/transcribe`,
      { method: "POST" }
    );
    if (!transcribe.ok) {
      const data = await transcribe.json().catch(() => null);
      setStage("empty");
      throw new Error(data?.error ?? "Could not transcribe the recording");
    }
    const rec = (await transcribe.json()) as Recording;
    setRecording(rec);

    setStage("structuring");
    let next: StructuredBriefing;
    try {
      next = await runStructure(recordingId, prompt);
    } catch (e) {
      setStage("empty");
      throw e;
    }

    /* Deliberately not filed here. Save changes owns the write, so the button
       reflects whether anything is actually outstanding. */
    setDirty(true);
    setStage("done");
  }

  /* Re-runs against the saved transcript. The audio is never touched again. */
  async function runStructure(recordingId: string, withPrompt: string) {
    const res = await fetch(`/api/recordings/${recordingId}/structure`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: withPrompt, runId, carriedGoals }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      throw new Error(data?.error ?? "Could not structure the briefing");
    }
    const next = (await res.json()) as StructuredBriefing;
    setStructured(next);
    return next;
  }

  async function handleRestructure(withPrompt: string) {
    if (!recording) return;
    await runStructure(recording.id, withPrompt);
    setDirty(true);
  }

  function handleTranscriptChange(transcript: string) {
    if (!recording) return;
    setRecording({ ...recording, transcript });
    /* Held until Save changes rather than PATCHed per keystroke. That call went
       to /api/recordings/{id}/transcript, which does not exist — it was
       fire-and-forget, so every edit 404'd silently. The transcript is written
       to Storage by the save, so the edit is not lost, it just waits. */
    setDirty(true);
  }

  /* Goals and decisions flow on: goals into the capture questions,
     decisions into the action items, open items onto the debrief agenda. */
  /* Transcript to Storage, structured record to Firestore beside the rest of
     the race day. Both go through one route so they cannot drift apart. */
  async function persist(
    record: StructuredBriefing | null,
    rec: Recording | null,
    withPrompt: string,
  ) {
    if (!record) return;
    await fetch(`/api/sessions/${runId}/briefing`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        structured: record,
        prompt: withPrompt,
        transcript: rec?.transcript,
        recordingId: rec?.id,
        filename: rec?.filename,
      }),
    });
  }

  async function handleSave() {
    await persist(structured, recording, prompt);
    setDirty(false);
  }

  /* Held back until the fetch resolves, so a run with a saved briefing does not
     flash the upload prompt before filling in. */
  if (!loaded) {
    return (
      <div style={{ background: "#F7F4ED", minHeight: "100%", padding: 22, color: "#8E877A", fontSize: 13 }}>
        Loading the briefing…
      </div>
    );
  }

  return (
    <div style={{ background: "#F7F4ED", minHeight: "100%", padding: 22 }}>
      <Briefing
        carriedGoals={carriedGoals}
        recording={recording}
        structured={structured}
        prompt={prompt}
        onPromptChange={(next) => { setPrompt(next); setDirty(true); }}
        runId={runId}
        onUpload={handleUpload}
        uploadError={uploadError}
        dirty={dirty}
        hasRecording={Boolean(recording)}
        onRestructure={handleRestructure}
        onTranscriptChange={handleTranscriptChange}
        onSave={handleSave}
        stage={stage}
      />
    </div>
  );
}
