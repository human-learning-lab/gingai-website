'use client';

import React, { useState, useRef, useEffect } from "react";

// ============================================================
// Ginga — sailor capture page · reference implementation
//
// Hand this to Claude Code alongside ginga-sailor-page-spec.md.
// Real MediaRecorder audio. Three modes driven by one prop.
// Replace the mock `run` object with a fetch from your API.
// ============================================================

const C = {
  paper: "#F7F4ED", sand: "#EDE7DA", line: "#DDD5C4",
  green: "#00A651", greenLt: "#E6F4EA", clay: "#C4622D",
  ink: "#1A1A18", warm: "#6B6459", warmLt: "#8E877A",
};
const DISPLAY = "'Archivo Narrow','Roboto Condensed','IBM Plex Sans Condensed',system-ui,sans-serif";
const UI = "'Inter','IBM Plex Sans',-apple-system,system-ui,sans-serif";

// ---- shared types ----
type Mode = "capture" | "priming" | "note";

interface QuestionContext {
  label: string;
  body?: string;
  list?: string[];
}

interface Question {
  id: string;
  text: string;
  context?: QuestionContext;
}

interface RunData {
  mode: Mode;
  sailor: { firstName: string; role: string };
  event: { venue: string; dayLabel: string };
  nextMeeting?: string;
  questions: Question[];
}

interface SentAnswer {
  q: string;
  kind: "voice" | "text";
  len: number;
  blob?: Blob | null;
  text?: string;
}

type ShareChoice = "private" | "rich" | "team";

// ---- mock payload — replace with GET /api/capture/{token} ----
const MOCK = {
  capture: {
    mode: "capture",
    sailor: { firstName: "Rasmus", role: "Flight Controller" },
    event: { venue: "Sassnitz", dayLabel: "Race day 2" },
    nextMeeting: "Debrief 19:30 — tent",
    questions: [
      { id: "q1", text: "What is the main thing on your mind?" },
      { id: "q2", text: "Did you achieve the goal you set this morning?",
        context: { label: "YOUR GOAL THIS MORNING", body: "Make the first call one phase earlier, even when not fully certain." } },
      { id: "q3", text: "Where did the plan break down most clearly?" },
      { id: "q4", text: "What should we take into tomorrow?",
        context: { label: "TODAY'S SQUAD GOALS", list: ["Plan the start → execute incl. X position", "TWS comms defines mode", "Sterile cockpit in manoeuvres"] } },
    ],
  },
  priming: {
    mode: "priming",
    sailor: { firstName: "Rasmus", role: "Flight Controller" },
    event: { venue: "Sassnitz", dayLabel: "Tomorrow" },
    nextMeeting: "Briefing 12:00 — tent",
    questions: [
      { id: "p1", text: "What will matter most in your area tomorrow?",
        context: { label: "CONDITIONS", body: "14–19 kts SW, shifty. 24m wing." } },
      { id: "p2", text: "What are your uncertainties?" },
      { id: "p3", text: "What will you personally do about it?" },
    ],
  },
  note: {
    mode: "note",
    sailor: { firstName: "Rasmus", role: "Flight Controller" },
    event: { venue: "Sassnitz", dayLabel: "" },
    questions: [],
  },
} satisfies Record<Mode, RunData>;

export default function SailorPage() {
  const [mode, setMode] = useState<Mode>("capture");   // dev switcher only — remove in production
  return (
    <div style={{ background: C.sand, minHeight: 640, fontFamily: UI, padding: "16px 0" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Archivo+Narrow:wght@400;600;700&family=Inter:wght@400;500;600&display=swap');
        *{box-sizing:border-box}`}</style>

      {/* dev only — production reads mode from the URL */}
      <div style={{ display: "flex", gap: 5, justifyContent: "center", marginBottom: 14 }}>
        {(["priming", "capture", "note"] as Mode[]).map(m => (
          <button key={m} onClick={() => setMode(m)} style={{
            padding: "5px 12px", borderRadius: 6, cursor: "pointer", fontSize: 11.5, fontFamily: UI,
            background: mode === m ? C.green : "transparent", color: mode === m ? "#fff" : C.warm,
            border: mode === m ? "none" : `1px solid ${C.line}`,
          }}>{m}</button>
        ))}
      </div>

      <Page key={mode} run={MOCK[mode]} />
    </div>
  );
}

function Page({ run }: { run: RunData }) {
  const isNote = run.mode === "note";
  const [step, setStep] = useState(0);
  const [inputMode, setInputMode] = useState<"voice" | "text">("voice");
  const [draft, setDraft] = useState("");
  const [sent, setSent] = useState<SentAnswer[]>([]);
  const [micDenied, setMicDenied] = useState(false);
  const [noteDone, setNoteDone] = useState(false);
  const { recording, secs, start, stop, error } = useRecorder();

  useEffect(() => { if (error) { setMicDenied(true); setInputMode("text"); } }, [error]);

  const q = run.questions[step];
  const finished = isNote ? noteDone : step >= run.questions.length;

  async function submitVoice() {
    const blob = await stop();
    push({ kind: "voice", len: secs, blob });
  }
  function submitText() {
    if (!draft.trim()) return;
    push({ kind: "text", len: draft.trim().length, text: draft.trim() });
  }
  function push(answer: Omit<SentAnswer, "q">) {
    // POST /api/capture/{token}/answer — one request per answer
    setSent(s => [...s, { q: isNote ? "A thought" : q.text, ...answer }]);
    setDraft("");
    if (isNote) setNoteDone(true); else setStep(s => s + 1);
  }

  const titles: Record<Mode, string> = { priming: "Priming", capture: "Capture", note: "A thought" };
  const title = titles[run.mode];
  const kicker = isNote
    ? `${run.event.venue} week`
    : `${run.event.dayLabel} · ${run.event.venue}`;

  return (
    <div style={{
      maxWidth: 420, margin: "0 auto", background: C.paper, border: `1px solid ${C.line}`,
      borderRadius: 12, minHeight: 560, display: "flex", flexDirection: "column", overflow: "hidden",
    }}>
      <header style={{ padding: "16px 19px 13px", borderBottom: `1px solid ${C.line}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={lbl}>{kicker}</div>
          <h1 style={{ fontFamily: DISPLAY, fontSize: 25, fontWeight: 700, color: C.ink, margin: "2px 0 0", lineHeight: 1.1 }}>{title}</h1>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.ink }}>{run.sailor.firstName}</div>
          <div style={{ fontSize: 11, color: C.warmLt }}>{run.sailor.role}</div>
        </div>
      </header>

      {finished ? (
        <Done run={run} sent={sent} isNote={isNote} />
      ) : (
        <>
          {!isNote && (
            <div style={{ display: "flex", gap: 3, padding: "11px 19px 0" }}
                 aria-live="polite" aria-label={`Question ${step + 1} of ${run.questions.length}`}>
              {run.questions.map((_: Question, i: number) => (
                <span key={i} style={{ height: 3, flex: 1, borderRadius: 2, background: i <= step ? C.green : C.line }} />
              ))}
            </div>
          )}

          {!isNote && q.context && (
            <div style={{ margin: "13px 19px 0", padding: "11px 12px", background: C.sand, borderLeft: `2px solid ${C.green}`, borderRadius: "0 8px 8px 0" }}>
              <div style={{ ...lbl, marginBottom: 4 }}>{q.context.label}</div>
              {q.context.body && <div style={{ fontSize: 12.5, color: C.ink, lineHeight: 1.5 }}>{q.context.body}</div>}
              {q.context.list?.map((item: string, i: number) => (
                <div key={i} style={{ fontSize: 12, color: C.warm, lineHeight: 1.55, display: "flex", gap: 6 }}>
                  <span style={{ color: C.green, fontWeight: 600 }}>{i + 1}</span>{item}
                </div>
              ))}
            </div>
          )}

          {isNote && (
            <div style={{ margin: "16px 19px 0", padding: "11px 12px", background: C.sand, borderRadius: 8, fontSize: 12, color: C.warm, lineHeight: 1.5 }}>
              Yours until you choose to share it.
            </div>
          )}

          <div style={{ padding: "18px 19px 0", flex: 1 }}>
            {!isNote && <div style={{ ...lbl, color: C.green, marginBottom: 6 }}>Question {step + 1}</div>}
            <p style={{
              fontFamily: isNote ? UI : DISPLAY, fontSize: isNote ? 16 : 23,
              fontWeight: isNote ? 400 : 600, color: isNote ? C.warm : C.ink,
              lineHeight: 1.25, margin: 0,
            }}>
              {isNote ? "Something on your mind? Say it here." : q.text}
            </p>

            {micDenied && (
              <p style={{ fontSize: 12, color: C.warm, marginTop: 12, lineHeight: 1.5 }}>
                Recording isn't available — type your answer instead.
              </p>
            )}

            {inputMode === "text" && (
              <textarea
                value={draft} onChange={e => setDraft(e.target.value)}
                placeholder="Type your answer…" aria-label="Your answer"
                style={{
                  width: "100%", marginTop: 15, minHeight: 100, padding: "11px 12px",
                  border: `1px solid ${C.line}`, borderRadius: 7, background: "#FFFDF8",
                  fontFamily: UI, fontSize: 13.5, lineHeight: 1.55, color: C.ink, resize: "none", outline: "none",
                }} />
            )}

            {inputMode === "voice" && recording && <Waveform secs={secs} />}
          </div>

          <div style={{ padding: "13px 19px 18px", borderTop: `1px solid ${C.line}` }}>
            {inputMode === "voice" ? (
              <>
                <button onClick={() => recording ? submitVoice() : start()} style={{
                  ...btn, background: recording ? C.clay : C.green,
                }}>{recording ? "Stop and send" : "Hold to record"}</button>
                {!micDenied && (
                  <button onClick={() => setInputMode("text")} style={link}>or type instead</button>
                )}
              </>
            ) : (
              <>
                <button onClick={submitText} disabled={!draft.trim()} style={{
                  ...btn,
                  background: draft.trim() ? C.green : C.sand,
                  color: draft.trim() ? "#fff" : C.warmLt,
                  cursor: draft.trim() ? "pointer" : "not-allowed",
                }}>Send answer</button>
                {!micDenied && (
                  <button onClick={() => setInputMode("voice")} style={link}>or record instead</button>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Done({ run, sent, isNote }: { run: RunData; sent: SentAnswer[]; isNote: boolean }) {
  const [share, setShare] = useState<ShareChoice>("private");
  return (
    <div style={{ padding: "32px 22px", flex: 1, display: "flex", flexDirection: "column" }}>
      <div style={{ width: 38, height: 38, borderRadius: 38, background: C.greenLt, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 15 }}>
        <span style={{ color: C.green, fontSize: 18, fontWeight: 700 }}>✓</span>
      </div>

      {isNote ? (
        <>
          <h2 style={{ fontFamily: DISPLAY, fontSize: 25, fontWeight: 700, color: C.ink, margin: 0, lineHeight: 1.15 }}>
            Captured.
          </h2>
          <p style={{ fontSize: 13, color: C.warm, lineHeight: 1.6, marginTop: 10 }}>
            Who should see this?
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 7, marginTop: 6 }}>
            {([["private", "Keep it to myself"], ["rich", "Share with Rich"], ["team", "Share with the team"]] as [ShareChoice, string][]).map(([k, l]) => (
              <button key={k} onClick={() => setShare(k)} style={{
                textAlign: "left", padding: "11px 13px", borderRadius: 8, cursor: "pointer",
                fontFamily: UI, fontSize: 13,
                background: share === k ? C.greenLt : "transparent",
                border: `1px solid ${share === k ? C.green : C.line}`,
                color: C.ink,
              }}>{l}</button>
            ))}
          </div>
        </>
      ) : (
        <>
          <h2 style={{ fontFamily: DISPLAY, fontSize: 25, fontWeight: 700, color: C.ink, margin: 0, lineHeight: 1.15 }}>
            All in.<br />Thanks, {run.sailor.firstName}.
          </h2>
          <p style={{ fontSize: 13, color: C.warm, lineHeight: 1.6, marginTop: 11 }}>
            Your answers go straight into tonight's debrief picture. You'll get your own summary
            afterwards — what you set out to do, and what happened.
          </p>
          <div style={{ marginTop: 20, paddingTop: 15, borderTop: `1px solid ${C.line}` }}>
            <div style={{ ...lbl, marginBottom: 8 }}>What you sent</div>
            {sent.map((a: SentAnswer, i: number) => (
              <div key={i} style={{ display: "flex", gap: 9, padding: "6px 0", fontSize: 12, color: C.warm, alignItems: "baseline" }}>
                <span style={{ color: C.green, fontWeight: 600 }}>{i + 1}</span>
                <span style={{ flex: 1, lineHeight: 1.45 }}>{a.q}</span>
                <span style={lbl}>{a.kind === "voice" ? `${a.len}s` : "Text"}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {run.nextMeeting && (
        <div style={{ marginTop: "auto", padding: "11px 13px", background: C.sand, borderRadius: 8, fontSize: 11.5, color: C.warm, lineHeight: 1.5 }}>
          {run.nextMeeting}
        </div>
      )}
    </div>
  );
}

function Waveform({ secs }: { secs: number }) {
  return (
    <div style={{ marginTop: 18, display: "flex", alignItems: "center", gap: 9 }}
         aria-live="polite" aria-label={`Recording, ${secs} seconds`}>
      <span style={{ width: 7, height: 7, borderRadius: 7, background: C.clay }} />
      <span style={{ fontFamily: DISPLAY, fontSize: 19, fontWeight: 600, color: C.ink }}>
        {String(Math.floor(secs / 60)).padStart(2, "0")}:{String(secs % 60).padStart(2, "0")}
      </span>
      <div style={{ display: "flex", gap: 2, alignItems: "flex-end", height: 20, marginLeft: 3 }}>
        {[8, 15, 6, 18, 11, 16, 7, 13, 5, 15, 9, 12].map((h, i) => (
          <span key={i} style={{
            width: 2.5, height: h, background: C.green, borderRadius: 2,
            opacity: 0.35 + ((i + secs) % 4) * 0.2,
          }} />
        ))}
      </div>
    </div>
  );
}

// ---- real recording -----------------------------------------
function useRecorder() {
  const [recording, setRecording] = useState(false);
  const [secs, setSecs] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const rec = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus" : "audio/mp4";
      const r = new MediaRecorder(stream, { mimeType: mime });
      chunks.current = [];
      r.ondataavailable = (e: BlobEvent) => { if (e.data.size) chunks.current.push(e.data); };
      r.start();
      rec.current = r;
      setRecording(true); setSecs(0); setError(null);
      timer.current = setInterval(() => setSecs(s => s + 1), 1000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "microphone unavailable");
    }
  }

  function stop(): Promise<Blob | null> {
    return new Promise(resolve => {
      const r = rec.current;
      if (timer.current) clearInterval(timer.current);
      setRecording(false);
      if (!r) return resolve(null);
      r.onstop = () => {
        const blob = new Blob(chunks.current, { type: r.mimeType });
        r.stream.getTracks().forEach((t: MediaStreamTrack) => t.stop());
        resolve(blob);
      };
      r.stop();
    });
  }

  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);
  return { recording, secs, start, stop, error };
}

const lbl = {
  fontSize: 11, fontWeight: 600, letterSpacing: "0.11em",
  textTransform: "uppercase", color: C.warmLt, fontFamily: UI,
};
const btn = {
  width: "100%", padding: "13px 0", minHeight: 44, borderRadius: 8, border: "none",
  cursor: "pointer", color: "#fff", fontFamily: UI, fontSize: 14, fontWeight: 600,
};
const link = {
  width: "100%", padding: "9px 0", marginTop: 6, background: "transparent",
  border: "none", cursor: "pointer", fontFamily: UI, fontSize: 12, color: C.warmLt,
};
