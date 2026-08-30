"use client";

import React, { useRef, useState } from "react";

/* ============================================================
   Ginga — Briefing
   Upload the room recording, transcribe it, and let a prompt
   turn it into the record worth keeping.

   Goals and decisions stay structured because they feed the
   capture questions and the action items. Everything else is
   whatever the prompt decided to keep — headings included.
   ============================================================ */

/* ---------- types ---------- */

export interface SquadGoal {
  text: string;
  /** What changed from what was proposed in priming, and why. */
  change?: string;
}

export interface Decision {
  text: string;
  /** Only set when the transcript makes the owner clear. */
  owner?: string;
}

/**
 * A free section. The heading and the shape come from the prompt,
 * not the interface — change the prompt and the page follows.
 */
export interface BriefingSection {
  heading: string;
  body?: string;
  items?: string[];
  /** "open" renders as unresolved, so nothing reads as a conclusion. */
  tone?: "default" | "open";
}

export interface StructuredBriefing {
  goals: SquadGoal[];
  decisions: Decision[];
  sections: BriefingSection[];
}

export interface Recording {
  id: string;
  filename: string;
  /** e.g. "41m 12s" */
  duration: string;
  /** e.g. "12:04" */
  recordedAt: string;
  transcript: string;
}

export type Stage =
  | "empty"
  | "uploading"
  | "transcribing"
  | "structuring"
  | "done";

export interface BriefingProps {
  /** Squad goals proposed in priming. Shown before upload as context. */
  carriedGoals: string[];

  recording?: Recording | null;
  structured?: StructuredBriefing | null;

  prompt: string;
  onPromptChange: (next: string) => void;

  /** Upload, transcribe, structure. Report progress through onStageChange. */
  onUpload: (file: File) => Promise<void>;
  /** Why the last attempt failed, if it did. */
  uploadError?: string | null;
  /** Re-run the prompt against the saved transcript. Never re-processes audio. */
  onRestructure: (prompt: string) => Promise<void>;
  /** Persist an edited transcript. */
  onTranscriptChange?: (transcript: string) => void;
  onSave: () => Promise<void> | void;

  stage: Stage;
}

/* ---------- tokens ---------- */

const C = {
  paper: "#F7F4ED",
  sand: "#EDE7DA",
  sand2: "#E3DCCB",
  line: "#DDD5C4",
  green: "#00A651",
  greenLt: "#E6F4EA",
  greenDk: "#017C3E",
  clay: "#C4622D",
  clayLt: "#FBEFE7",
  ink: "#1A1A18",
  warm: "#6B6459",
  warmLt: "#8E877A",
  field: "#FFFDF8",
} as const;

const DISPLAY =
  "'Archivo Narrow','Roboto Condensed','IBM Plex Sans Condensed',system-ui,sans-serif";
const UI = "'Inter','IBM Plex Sans',-apple-system,system-ui,sans-serif";
const MONO = "ui-monospace,'SF Mono',Menlo,monospace";

const label: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.09em",
  textTransform: "uppercase",
  color: C.warmLt,
  fontFamily: UI,
};

const STAGE_ORDER: Stage[] = ["uploading", "transcribing", "structuring"];

/* ---------- component ---------- */

export default function Briefing({
  carriedGoals,
  recording = null,
  structured = null,
  prompt,
  onPromptChange,
  onUpload,
  uploadError = null,
  onRestructure,
  onTranscriptChange,
  onSave,
  stage,
}: BriefingProps) {
  const [depth, setDepth] = useState<"structured" | "transcript">("structured");
  const [saved, setSaved] = useState(false);
  const [restructuring, setRestructuring] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const busy = STAGE_ORDER.includes(stage);

  const pickFile = () => fileInput.current?.click();

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void onUpload(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) void onUpload(file);
  };

  const restructure = async () => {
    setRestructuring(true);
    try {
      await onRestructure(prompt);
    } finally {
      setRestructuring(false);
    }
  };

  const save = async () => {
    await onSave();
    setSaved(true);
  };

  return (
    <div style={{ fontFamily: UI, color: C.ink }}>
      <header style={{ marginBottom: 16 }}>
        <h1
          style={{ fontFamily: DISPLAY, fontSize: 22, fontWeight: 700, margin: 0 }}
        >
          Briefing
        </h1>
        <p
          style={{
            fontSize: 12.5,
            color: C.warm,
            margin: "4px 0 0",
            lineHeight: 1.55,
            maxWidth: 660,
          }}
        >
          Record the room, upload it here, and keep what was actually agreed —
          not what was planned.
        </p>
      </header>

      <input
        ref={fileInput}
        type="file"
        accept="audio/*"
        onChange={handleFile}
        style={{ display: "none" }}
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,1fr) 300px",
          gap: 16,
          alignItems: "start",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {stage === "empty" && (
            <>
              <Card title="Carried in from priming">
                {carriedGoals.map((goal, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      gap: 9,
                      padding: "8px 0",
                      fontSize: 13,
                      lineHeight: 1.5,
                      borderBottom:
                        i < carriedGoals.length - 1
                          ? `1px solid ${C.line}`
                          : "none",
                    }}
                  >
                    <span style={{ ...label, color: C.green, paddingTop: 2 }}>
                      {i + 1}
                    </span>
                    {goal}
                  </div>
                ))}
                <Footnote>
                  Proposed, not fixed. What the room agrees is what gets kept.
                </Footnote>
              </Card>

              <div
                onClick={pickFile}
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && pickFile()}
                style={{
                  border: `1.5px dashed ${C.line}`,
                  borderRadius: 10,
                  padding: "48px 20px",
                  textAlign: "center",
                  background: C.field,
                  cursor: "pointer",
                }}
              >
                <div style={{ fontSize: 26, color: C.warmLt, marginBottom: 10 }}>
                  ↓
                </div>
                <div
                  style={{
                    fontFamily: DISPLAY,
                    fontSize: 19,
                    fontWeight: 600,
                    marginBottom: 6,
                  }}
                >
                  Drop the briefing recording
                </div>
                <div
                  style={{
                    fontSize: 12.5,
                    color: C.warm,
                    lineHeight: 1.6,
                    maxWidth: 380,
                    margin: "0 auto",
                  }}
                >
                  m4a, mp3, wav or webm. Ginga transcribes it, then the prompt
                  turns it into the record — goals as agreed, decisions, and what
                  was left open.
                </div>
                <div style={{ marginTop: 16 }}>
                  <span
                    style={{
                      ...primaryButton,
                      display: "inline-block",
                      width: "auto",
                      padding: "10px 20px",
                    }}
                  >
                    Choose a file
                  </span>
                </div>
              </div>
            </>
          )}

          {uploadError && (
            <p
              role="alert"
              style={{
                margin: "0 0 12px",
                padding: "9px 12px",
                borderRadius: 5,
                border: "1px solid #C4392C",
                background: "rgba(196,57,44,0.07)",
                color: "#C4392C",
                fontSize: 12.5,
                lineHeight: 1.45,
              }}
            >
              {uploadError}
            </p>
          )}

          {busy && <Progress stage={stage} />}

          {stage === "done" && recording && structured && (
            <>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <h2
                    style={{
                      fontFamily: DISPLAY,
                      fontSize: 19,
                      fontWeight: 600,
                      margin: 0,
                    }}
                  >
                    Briefing · {recording.recordedAt}
                  </h2>
                  <span style={label}>{recording.duration}</span>
                </div>
                <DepthToggle depth={depth} onChange={setDepth} />
              </div>

              {depth === "transcript" ? (
                <Card title="The room, as recorded">
                  <textarea
                    value={recording.transcript}
                    onChange={(e) => onTranscriptChange?.(e.target.value)}
                    readOnly={!onTranscriptChange}
                    style={{
                      width: "100%",
                      minHeight: 460,
                      padding: 0,
                      border: "none",
                      background: "transparent",
                      fontSize: 13,
                      lineHeight: 1.8,
                      color: C.ink,
                      fontFamily: UI,
                      resize: "vertical",
                      outline: "none",
                    }}
                  />
                  <div
                    style={{
                      paddingTop: 12,
                      borderTop: `1px solid ${C.line}`,
                      marginTop: 8,
                    }}
                  >
                    <Footnote>
                      Fix a name or a number and the structure can be rebuilt
                      from it.
                    </Footnote>
                  </div>
                </Card>
              ) : (
                <>
                  <Card title="Squad goals — as agreed">
                    {structured.goals.map((goal, i) => (
                      <div
                        key={i}
                        style={{
                          paddingBottom: 13,
                          marginBottom: 13,
                          borderBottom:
                            i < structured.goals.length - 1
                              ? `1px solid ${C.line}`
                              : "none",
                        }}
                      >
                        <div style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
                          <span style={{ ...label, color: C.green, paddingTop: 2 }}>
                            {i + 1}
                          </span>
                          <span style={{ fontSize: 13.5, lineHeight: 1.55 }}>
                            {goal.text}
                          </span>
                        </div>
                        {goal.change && (
                          <div
                            style={{
                              marginLeft: 30,
                              marginTop: 7,
                              padding: "9px 11px",
                              background: C.sand,
                              borderRadius: 6,
                              fontSize: 12,
                              color: C.warm,
                              lineHeight: 1.55,
                            }}
                          >
                            {goal.change}
                          </div>
                        )}
                      </div>
                    ))}
                  </Card>

                  <Card title="Decisions">
                    {structured.decisions.map((decision, i) => (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 14,
                          padding: "9px 0",
                          borderBottom:
                            i < structured.decisions.length - 1
                              ? `1px solid ${C.line}`
                              : "none",
                        }}
                      >
                        <span style={{ fontSize: 13, lineHeight: 1.5 }}>
                          {decision.text}
                        </span>
                        {decision.owner && (
                          <span
                            style={{
                              ...label,
                              whiteSpace: "nowrap",
                              paddingTop: 2,
                            }}
                          >
                            {decision.owner}
                          </span>
                        )}
                      </div>
                    ))}
                  </Card>

                  {structured.sections.length > 0 && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "4px 2px",
                      }}
                    >
                      <span style={{ height: 1, flex: 1, background: C.line }} />
                      <span style={label}>Kept by the prompt</span>
                      <span style={{ height: 1, flex: 1, background: C.line }} />
                    </div>
                  )}

                  {structured.sections.map((section, i) => (
                    <Section key={i} section={section} />
                  ))}
                </>
              )}
            </>
          )}
        </div>

        <aside
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 14,
            position: "sticky",
            top: 16,
          }}
        >
          <Card title="Structuring prompt">
            <p
              style={{
                fontSize: 12,
                color: C.warm,
                lineHeight: 1.55,
                margin: "0 0 10px",
              }}
            >
              How Ginga turns the recording into the record. Goals and decisions
              stay structured — they feed the capture questions and the action
              items. Everything else is yours: change the headings here and the
              page follows.
            </p>

            <textarea
              value={prompt}
              onChange={(e) => onPromptChange(e.target.value)}
              style={{
                width: "100%",
                minHeight: 200,
                padding: "11px 12px",
                border: `1px solid ${C.line}`,
                borderRadius: 7,
                background: C.field,
                fontSize: 12,
                lineHeight: 1.6,
                color: C.ink,
                resize: "vertical",
                fontFamily: MONO,
                outline: "none",
              }}
            />

            <button
              onClick={restructure}
              disabled={stage !== "done" || restructuring}
              style={{
                ...primaryButton,
                marginTop: 9,
                background: stage === "done" ? C.green : C.sand2,
                color: stage === "done" ? "#fff" : C.warmLt,
                cursor: stage === "done" ? "pointer" : "not-allowed",
                opacity: restructuring ? 0.55 : 1,
              }}
            >
              {restructuring ? "Re-reading…" : "Re-structure from transcript"}
            </button>

            <Footnote>
              Re-runs against the saved transcript. The audio is never
              re-processed.
            </Footnote>
          </Card>

          {stage === "done" && (
            <>
              <button
                onClick={save}
                style={{
                  ...primaryButton,
                  background: saved ? C.greenDk : C.ink,
                }}
              >
                {saved ? "Saved ✓" : "Save to the event record"}
              </button>
              {saved && (
                <div
                  style={{
                    padding: "11px 12px",
                    background: C.greenLt,
                    borderRadius: 8,
                    fontSize: 11.5,
                    color: C.greenDk,
                    lineHeight: 1.55,
                  }}
                >
                  Goals and decisions carried into the capture questions.
                  Anything left open goes to the debrief agenda.
                </div>
              )}
            </>
          )}
        </aside>
      </div>
    </div>
  );
}

/* ---------- sub-components ---------- */

function Progress({ stage }: { stage: Stage }) {
  const steps: [Stage, string][] = [
    ["uploading", "Uploading the recording"],
    ["transcribing", "Transcribing the room audio"],
    ["structuring", "Structuring against your prompt"],
  ];

  return (
    <Card title="Processing">
      <div style={{ padding: "10px 0" }}>
        {steps.map(([key, text]) => {
          const done = STAGE_ORDER.indexOf(stage) > STAGE_ORDER.indexOf(key);
          const now = stage === key;
          return (
            <div
              key={key}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "9px 0",
                fontSize: 13,
                color: done || now ? C.ink : C.warmLt,
              }}
            >
              <span
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 16,
                  flexShrink: 0,
                  background: done ? C.green : now ? C.greenLt : "transparent",
                  border: done || now ? "none" : `1px solid ${C.line}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontSize: 10,
                }}
              >
                {done ? "✓" : ""}
              </span>
              {text}
            </div>
          );
        })}
      </div>
      <Footnote>
        Multiple voices in a room. Expect the transcript to need a light edit —
        the audio is kept, so you can always check it.
      </Footnote>
    </Card>
  );
}

function Section({ section }: { section: BriefingSection }) {
  const open = section.tone === "open";

  const openStyle: React.CSSProperties = {
    padding: "11px 13px",
    background: C.clayLt,
    borderLeft: `2px solid ${C.clay}`,
    borderRadius: "0 7px 7px 0",
    fontSize: 13,
    color: C.ink,
    lineHeight: 1.6,
  };

  return (
    <Card title={section.heading}>
      {section.body &&
        (open ? (
          <div style={openStyle}>{section.body}</div>
        ) : (
          <div style={{ fontSize: 13, lineHeight: 1.6 }}>{section.body}</div>
        ))}

      {section.items?.map((item, i) =>
        open ? (
          <div
            key={i}
            style={{
              ...openStyle,
              marginBottom: i < (section.items?.length ?? 0) - 1 ? 8 : 0,
            }}
          >
            {item}
          </div>
        ) : (
          <div
            key={i}
            style={{
              display: "flex",
              gap: 8,
              padding: "7px 0",
              fontSize: 13,
              lineHeight: 1.5,
            }}
          >
            <span style={{ color: C.green, fontWeight: 600 }}>·</span>
            {item}
          </div>
        )
      )}

      {open && (
        <Footnote>
          Raised but not decided. Nothing here has been turned into a conclusion.
        </Footnote>
      )}
    </Card>
  );
}

function DepthToggle({
  depth,
  onChange,
}: {
  depth: "structured" | "transcript";
  onChange: (d: "structured" | "transcript") => void;
}) {
  const options: ["structured" | "transcript", string][] = [
    ["structured", "Structured"],
    ["transcript", "Transcript"],
  ];

  return (
    <div style={{ display: "flex", gap: 4 }}>
      {options.map(([key, text]) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          style={{
            padding: "5px 12px",
            borderRadius: 6,
            cursor: "pointer",
            fontSize: 11.5,
            fontFamily: UI,
            background: depth === key ? C.sand : "transparent",
            color: depth === key ? C.ink : C.warmLt,
            border: `1px solid ${depth === key ? C.line : "transparent"}`,
            fontWeight: depth === key ? 500 : 400,
          }}
        >
          {text}
        </button>
      ))}
    </div>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{
        background: C.field,
        border: `1px solid ${C.line}`,
        borderRadius: 9,
        padding: 15,
      }}
    >
      <h2 style={{ ...label, margin: "0 0 11px" }}>{title}</h2>
      {children}
    </section>
  );
}

function Footnote({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontSize: 11.5,
        color: C.warmLt,
        lineHeight: 1.5,
        margin: "9px 0 0",
      }}
    >
      {children}
    </p>
  );
}

/* ---------- shared styles ---------- */

const primaryButton: React.CSSProperties = {
  width: "100%",
  padding: "11px 0",
  borderRadius: 8,
  border: "none",
  cursor: "pointer",
  background: C.green,
  color: "#fff",
  fontSize: 13,
  fontWeight: 600,
  fontFamily: UI,
};
