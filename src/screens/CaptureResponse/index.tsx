'use client';

import { useRole } from '@/context/RoleContext';
import { pruneClips, uploadClip } from "@/lib/audioClips";
import React, { useCallback, useState, useRef, useEffect } from "react";
import { IconStop } from '@/components/Icons';


const C = {
  paper: "#F7F4ED", sand: "#EDE7DA", line: "#DDD5C4",
  green: "#00A651", greenLt: "#E6F4EA", clay: "#C4622D",
  ink: "#1A1A18", warm: "#6B6459", warmLt: "#8E877A",
};
const DISPLAY = "'Archivo Narrow','Roboto Condensed','IBM Plex Sans Condensed',system-ui,sans-serif";
const UI = "'Inter','IBM Plex Sans',-apple-system,system-ui,sans-serif";

/** A recorded answer: playable at once, filed to Storage in the background. */
interface Clip {
  localUrl: string;
  url?: string;
  status: "uploading" | "saved" | "failed";
  error?: string;
}

type Phase    = 'idle' | 'recording' | 'transcribing' | 'review';

interface Sailor {
	role: string;
	firstName: string;
}

export default function CaptureResponsePage(
  { runId, sailorName, transcriptLines, onRecordingChange, kind = "capture"}:
  { runId: string;
    sailorName?: string;
    /* Which set of questions this page is answering. The screen is identical
       for a capture and an interview — only the run's kind differs, and it
       decides where answers, audio and the question set are read and written. */
    kind?: string;
    transcriptLines?: string[];
    onRecordingChange?: (recording: boolean) => Promise<Blob | null> | null | void;
  }) {
  const { role } = useRole();
  /* `role` is null while Clerk is still resolving, and when the stored roleId
     is not in this environment's roster — which happens whenever an account
     has signed in to both alpha and production. Render nothing rather than
     throw: ProtectedShell reassigns the role and re-renders. Throwing here
     unmounts the shell before its effect can run, so the page never recovers. */
  if (!role) return null;
  /* The link names whose set this is. Falling back to the signed-in role is
     only right when someone opens their own link — a forwarded link, or a
     shared device, would otherwise fetch the wrong sailor's questions. */
  const sailor = { firstName: sailorName || role.name, role: role.label };
  const event =  { venue: "Sassnitz", dayLabel: "Tomorrow" };
  return (
    <div className="ginga-viewport" style={{
      background: C.sand, fontFamily: UI, boxSizing: "border-box",
      display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center",
      padding: "clamp(10px, 2.5vh, 24px) clamp(8px, 2.5vw, 24px)",
      paddingBottom: "max(clamp(10px, 2.5vh, 24px), env(safe-area-inset-bottom))",
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Archivo+Narrow:wght@400;600;700&family=Inter:wght@400;500;600&display=swap');
        *{box-sizing:border-box}
        html,body,#root{height:100%;margin:0}
        .ginga-viewport{
          min-height:100vh;
          min-height:100svh; /* never exceeds the visible area, even with address bar shown */
          width:100%;
          overflow-y:auto; /* safety net: scroll instead of clip if content is taller than the viewport */
          -webkit-overflow-scrolling:touch;
        }
        @supports (height: 100dvh){ .ginga-viewport{min-height:100dvh} }
        .ginga-card{
          width:min(96vw, 460px);
          height:min(94vh, 780px);
          height:min(94svh, 780px);
          max-height:100%;
        }
        @supports (height: 100dvh){ .ginga-card{height:min(94dvh, 780px)} }
        @media (max-height: 600px){
          .ginga-card{height:min(98svh, 780px)}
        }
        @media (max-width: 640px){
          .ginga-viewport{
            align-items:stretch !important;
            justify-content:flex-start !important;
            padding-left:0 !important;
            padding-right:0 !important;
            padding-top:env(safe-area-inset-top) !important;
            padding-bottom:0 !important;
          }
          .ginga-card{
            width:100% !important;
            height:100svh !important;
            max-height:none !important;
            border-left:none;
            border-right:none;
            border-radius:0;
          }
          @supports (height: 100dvh){ .ginga-card{height:100dvh !important} }
        }
	 	/* Extra clearance so the controls aren't hidden behind an app/
           browser navbar docked at the bottom of the screen. */
        .ginga-footer{
          padding-bottom: max(18px, env(safe-area-inset-bottom));
        }
        @media (max-width: 640px){
          .ginga-footer{
            padding-bottom: calc(110px + env(safe-area-inset-bottom)) !important;
          }
        }
        .rec-btn{
          width:56px; height:56px; border-radius:56px; border:none;
          display:flex; align-items:center; justify-content:center;
          cursor:pointer; flex-shrink:0;
        }
        .rec-info{ text-align:center; margin-top:8px; }
        .rec-lbl{ font-size:12px; font-weight:600; color:${C.warm}; }
        .rec-time{ font-family:${DISPLAY}; font-size:19px; font-weight:600; color:${C.ink}; margin-top:2px;}
      `}</style>


	 <Page 
	  	runId={runId} 
		sailor={sailor} 
		transcriptLines={transcriptLines}
		kind={kind}
		onRecordingChange={onRecordingChange}/>
    </div>
  );
}

function Page({ runId, sailor, transcriptLines, onRecordingChange, kind }: 
{
  runId: string;
  sailor: Sailor;
  kind: string;
  transcriptLines?: string[];
  onRecordingChange?: (recording: boolean) => Promise<Blob | null> | null | void;
}){
  const [step, setStep] = useState(0);
  const [inputMode, setInputMode] = useState<"voice" | "text">("voice");
  const [draft, setDraft] = useState("");
  const [sent, setSent] = useState<string[]>([]);
  const [times, setTimes] = useState<number[]>([]);
  const [kinds, setKinds] = useState<string[]>([]);
  const [micDenied, setMicDenied] = useState(false);

  /* One recording per question, kept for playback on the way out and filed to
     Storage as soon as it exists. Playback uses the local blob so it is instant
     and works whether or not the upload has landed. */
  const [clips, setClips] = useState<Record<number, Clip>>({});
  /* The Storage paths this attempt wrote. Answering again replaces the whole
     set, so anything filed by a previous attempt and not rewritten here is
     stale — a question answered by voice the first time and by text the second
     must not keep playing back the old recording. */
  const filedPaths = useRef<Set<string>>(new Set());
  useEffect(
    () => () => { Object.values(clips).forEach(c => URL.revokeObjectURL(c.localUrl)); },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  /* The submission can be refused upstream: the backend checks the answer count
     against its own copy of the question set, so a sailor served a set that
     differs from the one filed for them gets a 400 and saves nothing. This
     screen used to post and never read the result, so it said "All in" over a
     rejection and the answers were simply gone. */
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { recording, secs, start, stop, error } = useRecorder();
  const [questions, setQuestions] = useState<string[]>([]);
  const [phase, setPhase]       = useState<Phase>('idle');
  const [recTime, setRecTime]   = useState(0);

  const lines    = transcriptLines ?? [];
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);


  // ── Live mode recording ───────────────────────

  const startRecording = useCallback(async () => {
    setPhase('recording');
    setRecTime(0);
    onRecordingChange?.(true);
    timerRef.current = setInterval(() => setRecTime(p => p + 1), 1000);
  }, []);

  /** Files one answer's audio, and records on screen whether it landed. */
  const keepClip = useCallback(async (index: number, blob: Blob) => {
    const localUrl = URL.createObjectURL(blob);
    setClips(c => ({ ...c, [index]: { localUrl, status: "uploading" } }));
    try {
      const { path, url } = await uploadClip({
        runId, kind, sailor: sailor.firstName, index, blob,
      });
      filedPaths.current.add(path);
      setClips(c => ({ ...c, [index]: { ...c[index], url, status: "saved" } }));
    } catch (err) {
      setClips(c => ({
        ...c,
        [index]: {
          ...c[index],
          status: "failed",
          error: err instanceof Error ? err.message : "Could not save the recording",
        },
      }));
    }
  }, [runId, sailor.firstName]);

  const stopRecording = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    /* Hand the transcript to submitText directly. setDraft does not apply
       until the next render, so reading `draft` here would submit the value
       from before the recording — an empty answer. */
    const transcript = lines.join('\n');
    setDraft(transcript);

    /* Started, not awaited: the sailor moves to the next question straight
       away, and the recording is filed against the question it answers once
       the recorder has finished draining. */
    const index = step;
    const pending = onRecordingChange?.(false) ?? null;
    submitText(transcript);
    const clip = await pending;
    if (clip) void keepClip(index, clip);
  }, [lines, onRecordingChange, step, keepClip]);


  useEffect(() => {
	  async function getResp(){
		/* Firestore first: /create_run will not replace an existing set, so
		   Viktor's API can still be serving questions that were superseded.
		   The mirror always holds the latest. Falls back for runs that
		   predate it. */
		const mirrored = await fetch(
			`/api/question-set?runId=${encodeURIComponent(runId)}&sailor=${encodeURIComponent(sailor.firstName)}&kind=${encodeURIComponent(kind)}`,
		);
		if (mirrored.ok) {
			const set = await mirrored.json();
			if (set.questions?.length) {
				setQuestions(set.questions);
				return;
			}
		}

	  	const res = await fetch(`/api/responses/${runId}?kind=${encodeURIComponent(kind)}&sailor=${sailor.firstName}`);
	  	const resps = await res.json();
		if (resps.questions)
	  		setQuestions(resps.questions);
	  }
	  
	  getResp();
  }, []); 


  useEffect(() => { if (error) { setMicDenied(true); setInputMode("text"); } }, [error]);

  const q = questions.length ? questions[step] : "";
  const finished = step >= questions.length;

  /** `text` is passed by the voice path, where `draft` is still a render behind. */
  function submitText(text?: string) {
	setPhase('idle');
    push((text ?? draft).trim());
	setInputMode("voice");
  }

  /** Files the whole set. Success upstream is `200 null`, so only the status
      tells us anything; the body carries FastAPI's `detail` on a refusal. */
  async function submitAll(answers: string[]) {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/responses/${runId}?kind=${encodeURIComponent(kind)}`, {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ respondee: sailor.firstName, responses: answers }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.detail ?? `The server refused the answers (${res.status}).`);
      }

      /* Only now. An abandoned half-attempt must leave the previous recordings
         alone, because the answers behind them are still the filed ones. */
      void pruneClips(runId, kind, sailor.firstName, [...filedPaths.current])
        .catch(() => undefined);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'The answers could not be sent.');
    } finally {
      setSaving(false);
    }
  }

  function push(answer: string) {
    setSent(s => [...s, answer]);
    setKinds(s => [...s, inputMode]);
    setTimes(s => [...s, recTime]);
    setDraft("");
    setStep(s => s + 1);
	if (step >= questions.length - 1) void submitAll([...sent, answer]);
  }


  const mm = String(Math.floor(recTime / 60)).padStart(2, '0');
  const ss = String(recTime % 60).padStart(2, '0');
  const title = 'Capture';
  const kicker = runId;

  const liveConvoContent = (
    <>
      {phase === 'recording' && (
        <div className="ai-q">
          <div className="ai-q-bub">
            { <Waveform secs={recTime} /> }
          </div>
        </div>
      )}

      {phase === 'review' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div className="sailor-r" style={{ alignItems: 'flex-start' }}>
            <textarea
              autoFocus
              value={draft}
              onChange={e => setDraft(e.target.value)}
              rows={Math.max(3, draft.split('\n').length + 1)}
              style={{
                flex: 1, background: 'var(--gg)', border: '1.5px solid var(--green)',
                borderRadius: '12px 3px 12px 12px', padding: '11px 13px',
                fontSize: 13, color: 'var(--text)', lineHeight: 1.6,
                fontFamily: 'inherit', outline: 'none', resize: 'none',
                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                direction: 'ltr', textAlign: 'left', width: '100%',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>
      )}
    </>
  );


  const liveControlsContent = (
    <>

      {phase === 'review' ? (
        <div style={{ display: 'flex', gap: 10, width: '100%', maxWidth: 340 }}>
          <button
            onClick={() => { setDraft(''); startRecording(); }}
            style={{
              height: 44, padding: '0 16px', borderRadius: 10,
              border: '1px solid var(--line)', background: 'transparent',
              fontSize: 12, cursor: 'pointer', color: 'var(--text3)', fontFamily: 'inherit',
              flexShrink: 0,
            }}
          >Re-record</button>
          <button
            onClick={() => { submitText(); }}
            disabled={!draft.trim()}
            style={{
              flex: 1, height: 44, borderRadius: 10, border: 'none',
              background: draft.trim() ? 'var(--green)' : 'var(--line)',
              color: '#fff', fontSize: 13, fontWeight: 600,
              cursor: draft.trim() ? 'pointer' : 'default',
              fontFamily: 'inherit', display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 7, transition: 'opacity 0.15s',
              opacity: draft.trim() ? 1 : 0.4,
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            Save note
          </button>
        </div>
      ) : phase === 'idle' ? (
 		<>
          <button className="rec-btn" onClick={() => { startRecording(); setInputMode('voice');}}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="white">
              <rect x="5" y="1" width="6" height="9" rx="3" fill="white"/>
              <path d="M3 8a5 5 0 0 0 10 0" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
              <line x1="8" y1="13" x2="8" y2="15" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
          <div className="rec-info">
            <div className="rec-lbl">Tap to record</div>
          </div>
        </>
      ) : phase === 'recording' ? (
        <>
          <button className="rec-btn" onClick={stopRecording}><IconStop /></button>
          <div className="rec-info">
            <div className="rec-lbl" style={{ color: 'var(--green)' }}>Recording</div>
            <div className="rec-time">{mm}:{ss}</div>
          </div>
        </>
      ) : (
        <>
          <div className="rec-btn" style={{ opacity: 0.3, cursor: 'default' }}><IconStop /></div>
          <div className="rec-info">
            <div className="rec-lbl">Transcribing…</div>
          </div>
        </>
      )}
    </>
  );


  return (
    <div className="ginga-card" style={{
      margin: "0 auto", background: C.paper, border: `1px solid ${C.line}`,
      borderRadius: 12, display: "flex", flexDirection: "column", overflow: "hidden",
      flexShrink: 0,
    }}>
      <header style={{ padding: "16px 19px 13px", borderBottom: `1px solid ${C.line}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexShrink: 0 }}>
        <div>
          <div style={lbl}>{kicker}</div>
          <h1 style={{ fontFamily: DISPLAY, fontSize: "clamp(21px, 4.5vh, 26px)", fontWeight: 700, color: C.ink, margin: "2px 0 0", lineHeight: 1.1 }}>{title}</h1>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.ink }}>{sailor.firstName}</div>
          <div style={{ fontSize: 11, color: C.warmLt }}>{sailor.role}</div>
        </div>
      </header>

      {finished ? (
        <Done sent={sent} questions={questions} sailor={sailor} kinds={kinds} times={times} saveError={saveError} saving={saving} onRetry={() => void submitAll(sent)} clips={clips} />
      ) : (
        <>
          { 
            <div style={{ display: "flex", gap: 3, padding: "11px 19px 0", flexShrink: 0 }}
                 aria-live="polite" aria-label={`Question ${step + 1} of ${questions.length}`}>
              {questions.map((_: string, i: number) => (
                <span key={i} style={{ height: 3, flex: 1, borderRadius: 2, background: i <= step ? C.green : C.line }} />
              ))}
            </div>
          }

              
          <div style={{ padding: "18px 19px 0", flex: 1, minHeight: 0, overflowY: "auto" }}>
            {<div style={{ ...lbl, color: C.green, marginBottom: 6 }}>Question {step + 1}</div>}
            <p style={{
              fontFamily: DISPLAY, fontSize: "clamp(19px, 3.6vh, 24px)",
              fontWeight:  600, color: C.ink,
              lineHeight: 1.25, margin: 0,
            }}>
			{q}
            </p>

            {micDenied && (
              <p style={{ fontSize: 12, color: C.warm, marginTop: 12, lineHeight: 1.5 }}>
                Recording isn't available — type your answer instead.
              </p>
            )}
            {liveConvoContent}
          </div>

		  <div className="ginga-footer" style={{ padding: "13px 19px", borderTop: `1px solid ${C.line}`, flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center" }}>
            {inputMode === "voice" ? (
              <>
			  	{liveControlsContent}
                {!micDenied && (
                  <button onClick={() => {setPhase('review'); setInputMode('text');}} style={{ ...link, color: C.green, fontWeight: 600 }}>or type instead</button>
                )}
              </>
            ) : (
              <>
                <button onClick={() => submitText()} disabled={!draft.trim()} style={{
                  ...btn,
                  background: draft.trim() ? C.green : C.sand,
                  color: draft.trim() ? "#fff" : C.warmLt,
                  cursor: draft.trim() ? "pointer" : "not-allowed",
                }}>Send answer</button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Done({questions, sent, kinds, times, sailor, saveError, saving, onRetry, clips}: {questions: string[], sent: string[]; kinds: string[]; times: number[]; sailor: Sailor; saveError: string | null; saving: boolean; onRetry: () => void; clips: Record<number, Clip>}) {
  return (
    <div style={{ padding: "32px 22px", flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
      <div style={{ width: 38, height: 38, borderRadius: 38, background: saveError ? "#F7E4D8" : C.greenLt, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 15 }}>
        <span style={{ color: saveError ? C.clay : C.green, fontSize: 18, fontWeight: 700 }}>{saveError ? "!" : "✓"}</span>
      </div>

      {(
        <>
          <h2 style={{ fontFamily: DISPLAY, fontSize: 25, fontWeight: 700, color: C.ink, margin: 0, lineHeight: 1.15 }}>
            {saveError
              ? <>Not sent.<br />Sorry, {sailor.firstName}.</>
              : <>All in.<br />Thanks, {sailor.firstName}.</>}
          </h2>
          {saveError ? (
            <>
              <p style={{ fontSize: 13, color: C.warm, lineHeight: 1.6, marginTop: 11 }}>
                Your answers are still here, but they did not reach the team — nothing was saved.
                Try again, and tell the coach if it keeps failing.
              </p>
              <p style={{ fontSize: 12, color: C.clay, lineHeight: 1.5, marginTop: 9 }}>{saveError}</p>
              <button
                onClick={onRetry}
                disabled={saving}
                style={{ marginTop: 12, padding: "9px 16px", borderRadius: 8, border: "none", background: saving ? C.warmLt : C.ink, color: C.paper, fontFamily: UI, fontSize: 13, fontWeight: 600, cursor: saving ? "default" : "pointer" }}
              >
                {saving ? "Sending…" : "Try again"}
              </button>
            </>
          ) : (
            <p style={{ fontSize: 13, color: C.warm, lineHeight: 1.6, marginTop: 11 }}>
              Your answers go straight into tonight's debrief picture. You'll get your own summary
              afterwards — what you set out to do, and what happened.
            </p>
          )}
          <div style={{ marginTop: 20, paddingTop: 15, borderTop: `1px solid ${C.line}` }}>
            <div style={{ ...lbl, marginBottom: 8 }}>{saveError ? "What you answered" : "What you sent"}</div>
            {sent.map((a: string, i: number) => (
              <div key={i} style={{ padding: "6px 0" }}>
                <div style={{ display: "flex", gap: 9, fontSize: 12, color: C.warm, alignItems: "baseline" }}>
                  <span style={{ color: C.green, fontWeight: 600 }}>{i + 1}</span>
                  <span style={{ flex: 1, lineHeight: 1.45 }}>{questions[i]}</span>
                  <span style={{ flex: 1, lineHeight: 1.45 }}>{kinds[i] === 'voice' ? `Voice Note: ${times[i]}s` : 'Text'}</span>
                </div>
                {clips[i] && (
                  <div style={{ marginTop: 7, paddingLeft: 18 }}>
                    {/* Native controls on purpose: scrubbing, duration and the
                        volume behaviour a phone's own player gives are not worth
                        rebuilding badly. */}
                    <audio
                      controls
                      preload="metadata"
                      src={clips[i].localUrl}
                      style={{ width: "100%", height: 32 }}
                    />
                    <div
                      style={{
                        fontSize: 10.5,
                        marginTop: 3,
                        color: clips[i].status === "failed" ? C.clay : C.warmLt,
                      }}
                    >
                      {clips[i].status === "uploading"
                        ? "Saving the recording…"
                        : clips[i].status === "saved"
                        ? "Recording saved"
                        : `Recording not saved — ${clips[i].error}`}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
      </div>

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
