"use client";

import React, { useEffect, useMemo, useState } from "react";
import ContextFilePreview from "@/components/ContextFilePreview";
import { listClips } from "@/lib/audioClips";
import GenerateTeamDoc from "@/screens/Console/GenerateTeamDoc";
import {
  INTERVIEW_KIND,
  INTERVIEW_QUESTIONS,
  INTERVIEW_REFERENCE_SAILOR,
} from "@/data/interview";

/* ============================================================
   Ginga — Interview console

   Two steps, borrowed from Skeleton brief and Priming in: send
   the interview, then read it back and turn it into a profile.

   The difference from a race day is that this is not one. There
   is a single interview run for the whole squad, the questions
   are fixed rather than generated, and the output is a standing
   context file rather than a picture of a day.
   ============================================================ */

const C = {
  paper: "#F7F4ED",
  sand: "#EDE7DA",
  sand2: "#E3DCCB",
  line: "#DDD5C4",
  green: "#00A651",
  greenLt: "#E6F4EA",
  ink: "#1A1A18",
  warm: "#6B6459",
  warmLt: "#8E877A",
  clay: "#C4622D",
  field: "#FFFDF8",
} as const;

const DISPLAY = "'Archivo Narrow','Roboto Condensed',system-ui,sans-serif";
const UI = "'Inter','IBM Plex Sans',-apple-system,system-ui,sans-serif";

const label: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.11em",
  textTransform: "uppercase",
  color: C.warmLt,
};

export interface SailorLike {
  id: string;
  name: string;
  role: string;
}

export interface InterviewAnswer {
  recipient: string;
  questions: string[];
  responses: string[];
  updated_at?: string;
  distilled?: string[];
}

export interface InterviewConsoleProps {
  runId: string;
  sailors: SailorLike[];
  questions: string[];
  onQuestionsChange: (next: string[]) => void;
  answers: InterviewAnswer[];
  /** Sends the interview and opens a WhatsApp message per sailor. */
  onSend: (recipients: string[]) => Promise<void>;
  /** Condenses every answer to one line. */
  onDistil: () => Promise<void>;
  /** Rebuilds one sailor's context file from their answers alone. */
  onGenerate: (sailor: string) => Promise<string>;
}

type Step = "send" | "read";

export default function InterviewConsole({
  runId,
  sailors,
  questions,
  onQuestionsChange,
  answers,
  onSend,
  onDistil,
  onGenerate,
}: InterviewConsoleProps) {
  const [step, setStep] = useState<Step>("send");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const byName = useMemo(
    () => new Map(answers.map((a) => [a.recipient, a])),
    [answers],
  );
  const answered = useMemo(
    () => sailors.filter((s) => (byName.get(s.name)?.responses ?? []).some((r) => r?.trim())),
    [sailors, byName],
  );

  /** Returns whether the work succeeded, so a caller can refresh on success. */
  const run = async (key: string, fn: () => Promise<unknown>, done?: string) => {
    setBusy(key);
    setError(null);
    setNote(null);
    try {
      await fn();
      if (done) setNote(done);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      return false;
    } finally {
      setBusy(null);
    }
  };

  return (
    /* .screen-wrap is a flex parent with overflow:hidden, so a screen that does
       not scroll itself simply gets clipped. minHeight:0 is what lets a flex
       child shrink below its content and actually scroll. */
    <div
      className="phase-pad"
      style={{
        fontFamily: UI,
        color: C.ink,
        background: C.paper,
        flex: 1,
        minWidth: 0,
        minHeight: 0,
        overflowY: "auto",
        padding: 22,
      }}
    >
      <header style={{ marginBottom: 16 }}>
        <h1 style={{ fontFamily: DISPLAY, fontSize: 22, fontWeight: 700, margin: 0 }}>
          Interview console
        </h1>
        <p style={{ fontSize: 12.5, color: C.warm, margin: "4px 0 0", lineHeight: 1.55, maxWidth: 680 }}>
          One question per section of the context file. Send it once, read it
          back, and build each sailor&rsquo;s standing profile from what they
          actually said — {answered.length} of {sailors.length} answered.
        </p>
      </header>

      <div style={{ display: "flex", gap: 2, marginBottom: 16 }}>
        {([["send", "01 · Send the interview"], ["read", "02 · Answers in"]] as [Step, string][]).map(
          ([key, text]) => (
            <button
              key={key}
              onClick={() => setStep(key)}
              style={{
                padding: "7px 15px",
                borderRadius: 7,
                cursor: "pointer",
                fontSize: 12.5,
                fontWeight: 600,
                fontFamily: UI,
                background: step === key ? C.green : "transparent",
                color: step === key ? "#fff" : C.warm,
                border: step === key ? "none" : `1px solid ${C.line}`,
              }}
            >
              {text}
            </button>
          ),
        )}
      </div>

      {error && (
        <div
          role="alert"
          style={{
            margin: "0 0 14px",
            padding: "10px 13px",
            borderRadius: 7,
            background: "#FBEFE7",
            color: C.clay,
            fontSize: 12.5,
            lineHeight: 1.5,
          }}
        >
          {error}
        </div>
      )}
      {note && (
        <div
          style={{
            margin: "0 0 14px",
            padding: "10px 13px",
            borderRadius: 7,
            background: C.greenLt,
            color: "#017C3E",
            fontSize: 12.5,
            lineHeight: 1.5,
          }}
        >
          {note}
        </div>
      )}

      {step === "send" ? (
        <SendStep
          runId={runId}
          sailors={sailors}
          questions={questions}
          onQuestionsChange={onQuestionsChange}
          busy={busy}
          onSend={() => run("send", () => onSend(sailors.map((s) => s.name)))}
        />
      ) : (
        <ReadStep
          runId={runId}
          sailors={sailors}
          byName={byName}
          busy={busy}
          onDistil={() => run("distil", onDistil)}
          onGenerate={(sailor) =>
            run(`gen:${sailor}`, () => onGenerate(sailor), `${sailor}'s context file has been rebuilt from their interview.`)
          }
        />
      )}
    </div>
  );
}

/* ── 01 · Send ─────────────────────────────────────────────── */

function SendStep({
  runId,
  sailors,
  questions,
  onQuestionsChange,
  busy,
  onSend,
}: {
  runId: string;
  sailors: SailorLike[];
  questions: string[];
  onQuestionsChange: (next: string[]) => void;
  busy: string | null;
  onSend: () => void;
}) {
  const edit = (i: number, text: string) =>
    onQuestionsChange(questions.map((q, n) => (n === i ? text : q)));

  return (
    <div className="phase-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 320px", gap: 16, alignItems: "start" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Card title="The interview">
          <p style={{ fontSize: 12, color: C.warm, lineHeight: 1.55, margin: "0 0 12px" }}>
            Each question fills one section of the context file, in the order the
            file is written. Editable — but a question removed leaves its section
            with nothing behind it.
          </p>

          {questions.map((q, i) => (
            <div
              key={i}
              style={{
                padding: "11px 0",
                borderBottom: i < questions.length - 1 ? `1px solid ${C.line}` : "none",
              }}
            >
              <div style={{ ...label, color: C.green, marginBottom: 5 }}>
                {String(i + 1).padStart(2, "0")} · {INTERVIEW_QUESTIONS[i]?.section ?? "Extra"}
              </div>
              <textarea
                value={q}
                onChange={(e) => edit(i, e.target.value)}
                rows={2}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: 6,
                  border: `1px solid ${C.line}`,
                  background: C.field,
                  fontSize: 12.5,
                  lineHeight: 1.5,
                  color: C.ink,
                  fontFamily: UI,
                  resize: "vertical",
                }}
              />
            </div>
          ))}
        </Card>

        <button
          onClick={onSend}
          disabled={busy === "send"}
          style={{
            width: "100%",
            padding: "12px 0",
            borderRadius: 8,
            border: "none",
            background: busy === "send" ? C.sand2 : C.ink,
            color: busy === "send" ? C.warmLt : "#fff",
            fontSize: 13.5,
            fontWeight: 600,
            fontFamily: UI,
            cursor: busy === "send" ? "not-allowed" : "pointer",
          }}
        >
          {busy === "send"
            ? "Sending…"
            : `Send the interview to all ${sailors.length} →`}
        </button>
        <Footnote>
          One WhatsApp message per sailor, each carrying their own link to
          /interview. Filed under {runId}.
        </Footnote>
      </div>

      <div className="phase-sticky" style={{ position: "sticky", top: 16 }}>
        <ContextFilePreview
          label={`The worked example · ${INTERVIEW_REFERENCE_SAILOR}`}
          endpoint={`/api/sailor-profile?sailor=${encodeURIComponent(INTERVIEW_REFERENCE_SAILOR)}`}
        />
        <Footnote>
          What these answers are meant to produce. Every section here has one
          question behind it.
        </Footnote>
      </div>
    </div>
  );
}

/* ── 02 · Answers in ───────────────────────────────────────── */

function ReadStep({
  runId,
  sailors,
  byName,
  busy,
  onDistil,
  onGenerate,
}: {
  runId: string;
  sailors: SailorLike[];
  byName: Map<string, InterviewAnswer>;
  busy: string | null;
  onDistil: () => void;
  onGenerate: (sailor: string) => Promise<boolean>;
}) {
  const answeredNames = sailors
    .filter((s) => (byName.get(s.name)?.responses ?? []).some((r) => r?.trim()))
    .map((s) => s.name);

  const [selected, setSelected] = useState<string>(answeredNames[0] ?? "");
  const [depth, setDepth] = useState<"full" | "distilled">("full");
  /* The preview reads its file once, on mount. Generating replaces that file,
     so the panel would otherwise keep showing the version it was built from
     until the page was reloaded. Bumping this remounts it against the new one. */
  const [profileVersion, setProfileVersion] = useState(0);
  const row = selected ? byName.get(selected) : undefined;

  /* The recordings behind the answers, for whoever is being read. */
  const [clips, setClips] = useState<Record<number, string>>({});
  useEffect(() => {
    let cancelled = false;
    setClips({});
    if (!selected) return;
    listClips(runId, INTERVIEW_KIND, selected)
      .then((refs) => {
        if (cancelled) return;
        setClips(Object.fromEntries(refs.map((r) => [r.index, r.url])));
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [runId, selected]);

  return (
    <div className="phase-grid" style={{ display: "grid", gridTemplateColumns: "200px minmax(0,1fr) 300px", gap: 16, alignItems: "start" }}>
      <Card title="Crew">
        {sailors.map((s) => {
          const has = (byName.get(s.name)?.responses ?? []).some((r) => r?.trim());
          const active = selected === s.name;
          return (
            <button
              key={s.name}
              onClick={() => has && setSelected(s.name)}
              disabled={!has}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "8px 9px",
                marginBottom: 3,
                borderRadius: 6,
                border: "none",
                background: active ? C.sand : "transparent",
                cursor: has ? "pointer" : "default",
                opacity: has ? 1 : 0.45,
                fontFamily: UI,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: active ? 600 : 400, color: C.ink }}>{s.name}</div>
              <div style={{ fontSize: 11, color: C.warmLt }}>
                {has ? s.role : "No answers yet"}
              </div>
            </button>
          );
        })}
      </Card>

      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 11 }}>
          <h2 style={{ fontFamily: DISPLAY, fontSize: 19, fontWeight: 600, margin: 0 }}>
            {selected || "Nobody yet"}
            {row?.updated_at && (
              <span style={{ fontFamily: UI, fontSize: 12, fontWeight: 400, color: C.warmLt, marginLeft: 9 }}>
                {row.updated_at}
              </span>
            )}
          </h2>
          <div style={{ display: "flex", gap: 2 }}>
            {(["full", "distilled"] as const).map((k) => (
              <button
                key={k}
                onClick={() => setDepth(k)}
                style={{
                  padding: "6px 12px",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: 12,
                  fontFamily: UI,
                  background: depth === k ? C.green : "transparent",
                  color: depth === k ? "#fff" : C.warm,
                  border: depth === k ? "none" : `1px solid ${C.line}`,
                }}
              >
                {k === "full" ? "In their own words" : "Distilled"}
              </button>
            ))}
          </div>
        </div>

        {row ? (
          <Card title={depth === "full" ? "In their own words" : "Distilled"}>
            {row.questions.map((question, i) => (
              <div
                key={i}
                style={{
                  paddingBottom: 14,
                  marginBottom: 14,
                  borderBottom: i < row.questions.length - 1 ? `1px solid ${C.line}` : "none",
                }}
              >
                <div style={{ ...label, color: C.green, marginBottom: 5 }}>
                  {String(i + 1).padStart(2, "0")} · {INTERVIEW_QUESTIONS[i]?.section ?? "Extra"}
                </div>
                <div style={{ fontSize: 12.5, color: C.warm, marginBottom: 7, lineHeight: 1.5 }}>
                  {question}
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.65 }}>
                  {depth === "distilled"
                    ? row.distilled?.[i] || "—"
                    : row.responses[i]?.trim() || "—"}
                </div>
                {clips[i] && (
                  <audio
                    controls
                    preload="none"
                    src={clips[i]}
                    style={{ width: "100%", height: 32, marginTop: 9 }}
                  />
                )}
              </div>
            ))}
          </Card>
        ) : (
          <Card title="Nothing in yet">
            <p style={{ fontSize: 12.5, color: C.warmLt, margin: 0 }}>
              Answers appear here as they arrive.
            </p>
          </Card>
        )}
      </div>

      <div className="phase-sticky" style={{ position: "sticky", top: 16, display: "flex", flexDirection: "column", gap: 14 }}>
        <Card title="Distil">
          <p style={{ fontSize: 12, color: C.warm, lineHeight: 1.55, margin: "0 0 10px" }}>
            One line per answer, keeping the specifics. Both the line and the
            full answer are used when the profile is built.
          </p>
          <button
            onClick={onDistil}
            disabled={busy === "distil" || !answeredNames.length}
            style={{
              width: "100%",
              padding: "11px 0",
              borderRadius: 8,
              border: "none",
              background: answeredNames.length ? C.green : C.sand2,
              color: answeredNames.length ? "#fff" : C.warmLt,
              fontSize: 13,
              fontWeight: 600,
              fontFamily: UI,
              cursor: busy === "distil" || !answeredNames.length ? "not-allowed" : "pointer",
              opacity: busy === "distil" ? 0.55 : 1,
            }}
          >
            {busy === "distil" ? "Reading answers…" : "Distil every answer"}
          </button>
        </Card>

        <Card title="Context profile">
          <p style={{ fontSize: 12, color: C.warm, lineHeight: 1.55, margin: "0 0 10px" }}>
            Rebuilds {selected || "this sailor"}&rsquo;s current.md from these
            answers alone — no other transcripts are read.
          </p>
          <button
            onClick={async () => {
              if (!selected) return;
              if (await onGenerate(selected)) setProfileVersion((n) => n + 1);
            }}
            disabled={!selected || busy === `gen:${selected}`}
            style={{
              width: "100%",
              padding: "11px 0",
              borderRadius: 8,
              border: "none",
              background: selected ? C.ink : C.sand2,
              color: selected ? "#fff" : C.warmLt,
              fontSize: 13,
              fontWeight: 600,
              fontFamily: UI,
              cursor: !selected || busy === `gen:${selected}` ? "not-allowed" : "pointer",
              opacity: busy === `gen:${selected}` ? 0.55 : 1,
            }}
          >
            {busy === `gen:${selected}` ? "Writing the profile…" : "Generate context profile"}
          </button>
          <Footnote>Replaces the file that is there. The previous version is kept.</Footnote>
        </Card>

        {selected && (
          <ContextFilePreview
            key={`${selected}:${profileVersion}`}
            label={`Profile · ${selected}`}
            endpoint={`/api/sailor-profile?sailor=${encodeURIComponent(selected)}`}
          />
        )}

        {/* The squad file is read across the individual ones, so it belongs at
            the end of the screen that writes them — rebuild it once the
            profiles it reads are the ones you just built. */}
        <GenerateTeamDoc />
      </div>
    </div>
  );
}

/* ── shared ────────────────────────────────────────────────── */

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ background: C.field, border: `1px solid ${C.line}`, borderRadius: 9, padding: 15 }}>
      <h2 style={{ ...label, margin: "0 0 11px" }}>{title}</h2>
      {children}
    </section>
  );
}

function Footnote({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 11.5, color: C.warmLt, lineHeight: 1.55, margin: "9px 0 0" }}>{children}</p>
  );
}
