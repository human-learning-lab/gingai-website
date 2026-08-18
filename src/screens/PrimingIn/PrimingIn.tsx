"use client";

import React, { useMemo, useState } from "react";

/* ============================================================
   Ginga — Priming in
   Read what each sailor said, distil it, then build the team
   picture and squad goals the coach carries into the briefing.

   Data comes in through props; every generated result is
   requested through a callback. The component owns no
   persistence and calls no model directly.
   ============================================================ */

/* ---------- types ---------- */

export type SailorId = string;

export interface Sailor {
  id: SailorId;
  name: string;
  role: string;
}

/** One sailor's response to a priming run. */
export interface PrimingResponse {
  id: number;
  kind: string;
  questions: string[];
  responses: string[];
  recipient: SailorId;
  /** Local time it arrived, e.g. "18:34". */
  receivedAt: string;
  /** One condensed line per question, in question order. Absent until distilled. */
  distilled?: string[];
}

export interface ConvergenceItem {
  theme: string;
  count: number;
  sailorNames: string[];
}

export interface TeamPicture {
  convergence: ConvergenceItem[];
  /** Flagged for the room, deliberately unresolved. */
  divergence: string;
  uncertainties: string[];
}

export interface SquadGoal {
  goal: string;
  /** What would settle whether the goal was met. */
  evidence: string;
}

export interface Prompts {
  distil: string;
  synthesis: string;
  squadGoals: string;
}

export interface PrimingInProps {
  runId: string;
  sailors: Sailor[];
  questions: string[];
  responses: PrimingResponse[];

  prompts: Prompts;
  onPromptsChange: (next: Prompts) => void;

  teamPicture?: TeamPicture | null;
  squadGoals?: SquadGoal[];

  /** Re-condense every response. Returns distilled lines keyed by sailor. */
  onDistil: (prompt: string) => Promise<Record<SailorId, string[]>>;
  onSynthesise: (prompt: string) => Promise<TeamPicture>;
  onProposeGoals: (prompt: string) => Promise<SquadGoal[]>;

  onGoalsChange: (goals: SquadGoal[]) => void;
  /** Hand the picture and goals to the briefing. */
  onCarryForward: () => void;
}

type View = "individuals" | "team";
type Depth = "full" | "distilled";
type Busy = "distil" | "synthesis" | "goals" | null;

/* ---------- tokens ---------- */

const C = {
  paper: "#F7F4ED",
  sand: "#EDE7DA",
  sand2: "#E3DCCB",
  line: "#DDD5C4",
  green: "#00A651",
  greenLt: "#E6F4EA",
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

/* ---------- component ---------- */

export default function PrimingIn({
  runId,
  sailors,
  questions,
  responses,
  prompts,
  onPromptsChange,
  teamPicture = null,
  squadGoals = [],
  onDistil,
  onSynthesise,
  onProposeGoals,
  onGoalsChange,
  onCarryForward,
}: PrimingInProps) {
  const byId = useMemo(
    () => new Map(responses.map((r) => [r.recipient, r])),
    [responses]
  );
  const answered = useMemo(
	() => sailors.filter((s) => (byId.get(s.name)?.responses.length ?? 0) > 0),
    [sailors, byId]
  );

  const [view, setView] = useState<View>("individuals");
  const [depth, setDepth] = useState<Depth>("full");
  const [selected, setSelected] = useState<SailorId>(answered[0]?.name ?? "");
  const [busy, setBusy] = useState<Busy>(null);

  const response = byId.get(selected);
  const sailor = sailors.find((s) => s.name === selected);

  const setPrompt = (key: keyof Prompts, text: string) =>
    onPromptsChange({ ...prompts, [key]: text });

  const distil = async () => {
    setBusy("distil");
    try {
      await onDistil(prompts.distil);
      setDepth("distilled");
    } finally {
      setBusy(null);
    }
  };

  const synthesise = async () => {
    setBusy("synthesis");
    try {
      await onSynthesise(prompts.synthesis);
    } finally {
      setBusy(null);
    }
  };

  const proposeGoals = async () => {
    setBusy("goals");
    try {
      const goals = await onProposeGoals(prompts.squadGoals);
      onGoalsChange(goals);
    } finally {
      setBusy(null);
    }
  };

  const editGoal = (index: number, patch: Partial<SquadGoal>) =>
    onGoalsChange(
      squadGoals.map((g, i) => (i === index ? { ...g, ...patch } : g))
    );

  return (
    <div style={{ fontFamily: UI, color: C.ink }}>
      <header style={{ marginBottom: 16 }}>
        <h1
          style={{
            fontFamily: DISPLAY,
            fontSize: 22,
            fontWeight: 700,
            margin: 0,
          }}
        >
          Priming in
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
          Answers to last night&apos;s questions. Read them, then build the
          picture you carry into the briefing — {answered.length} of{" "}
          {sailors.length} in.
        </p>
      </header>

      <ViewToggle view={view} onChange={setView} />

      {view === "individuals" ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "212px minmax(0,1fr) 280px",
            gap: 16,
            alignItems: "start",
          }}
        >
          <Card title="Crew">
            {sailors.map((s) => (
              <CrewRow
                key={s.name}
                sailor={s}
                response={byId.get(s.name)}
                active={selected === s.name}
                onSelect={() => byId.has(s.name) && setSelected(s.name)}
              />
            ))}
          </Card>

          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 11,
              }}
            >
              <h2
                style={{
                  fontFamily: DISPLAY,
                  fontSize: 19,
                  fontWeight: 600,
                  margin: 0,
                }}
              >
                {sailor?.name}
                <span
                  style={{
                    fontFamily: UI,
                    fontSize: 12,
                    fontWeight: 400,
                    color: C.warmLt,
                    marginLeft: 9,
                  }}
                >
                  {response?.receivedAt}
                </span>
              </h2>
              <DepthToggle
                depth={depth}
                canDistil={Boolean(response?.distilled)}
                onChange={setDepth}
              />
            </div>

            {response ? (
              <Card
                title={
                  depth === "full"
                    ? `In their own words`
                    : "Distilled"
                }
              >
                {
                  <>
                    {response.questions.map((question, i) => (
                      <div
                        key={i}
                        style={{
                          paddingBottom: 14,
                          marginBottom: 14,
                          borderBottom:
                            i < response.questions.length - 1
                              ? `1px solid ${C.line}`
                              : "none",
                        }}
                      >
                        <div style={{ ...label, color: C.green, marginBottom: 6 }}>
                          Q{i + 1}
                        </div>
                        <div
                          style={{
                            fontSize: 12.5,
                            color: C.warm,
                            marginBottom: 7,
                            lineHeight: 1.5,
                          }}
                        >
                          {question}
                        </div>
                        <div style={{ fontSize: 13, lineHeight: 1.65 }}>
                          {response.responses[i] ?? "—"}
                        </div>
                      </div>
                    ))}
                    <Footnote>
                      Condensed by Ginga. Their own qualifiers are kept —
                      &ldquo;half&rdquo;, &ldquo;four of six&rdquo; — never
                      rounded to achieved or not.
                    </Footnote>
                  </>
                }
             </Card>
            ) : (
              <Card title="Nothing in yet">
                <Empty>Answers appear here as they arrive.</Empty>
              </Card>
            )}
          </div>

          <div style={{ position: "sticky", top: 16 }}>
            <Card title="Distilling prompt">
              <p
                style={{
                  fontSize: 12,
                  color: C.warm,
                  lineHeight: 1.55,
                  margin: "0 0 10px",
                }}
              >
                How Ginga condenses each answer. Edit it if the distilled version
                is losing something you need.
              </p>
              <PromptBox
                value={prompts.distil}
                onChange={(v) => setPrompt("distil", v)}
              />
              <button
                onClick={distil}
                disabled={busy === "distil"}
                style={{
                  ...primaryButton,
                  marginTop: 9,
                  opacity: busy === "distil" ? 0.55 : 1,
                }}
              >
                {busy === "distil" ? "Re-reading…" : "Re-distil all answers"}
              </button>
              <Footnote>
                Applies to everyone. The full answers are never touched.
              </Footnote>
            </Card>
          </div>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0,1fr) 300px",
            gap: 16,
            alignItems: "start",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {teamPicture ? (
              <>
                <Card title={`Convergence`}>
                  {teamPicture.convergence.map((item) => (
                    <div
                      key={item.theme}
                      style={{ padding: "9px 0", borderBottom: `1px solid ${C.line}` }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 12,
                        }}
                      >
                        <span style={{ fontSize: 13.5 }}>{item.theme}</span>
                        <span
                          style={{
                            fontFamily: MONO,
                            fontSize: 11,
                            color: C.warmLt,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {item.count} of {answered.length}
                        </span>
                      </div>
                      <div
                        style={{ fontSize: 11.5, color: C.warmLt, marginTop: 4 }}
                      >
                        {item.sailorNames.join(", ")}
                      </div>
                    </div>
                  ))}
                </Card>

                <Card title="Divergence — for the room">
                  <div
                    style={{
                      padding: "11px 13px",
                      background: C.clayLt,
                      borderLeft: `2px solid ${C.clay}`,
                      borderRadius: "0 7px 7px 0",
                      fontSize: 13,
                      lineHeight: 1.6,
                    }}
                  >
                    {teamPicture.divergence}
                  </div>
                </Card>

                <Card title="Uncertainties to answer in the briefing">
                  {teamPicture.uncertainties.map((u, i) => (
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
                      {u}
                    </div>
                  ))}
                </Card>
              </>
            ) : (
              <Card title="Team picture">
                <Empty>
                  Nothing generated yet.
                  <br />
                  <span style={{ fontSize: 12 }}>
                    Run the prompt to build the picture from {answered.length}{" "}
                    answers.
                  </span>
                </Empty>
              </Card>
            )}

            <Card title="Squad goals for the day">
              {squadGoals.length ? (
                <>
                  {squadGoals.map((g, i) => (
                    <div
                      key={i}
                      style={{
                        paddingBottom: 12,
                        marginBottom: 12,
                        borderBottom:
                          i < squadGoals.length - 1
                            ? `1px solid ${C.line}`
                            : "none",
                      }}
                    >
                      <div style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
                        <span style={{ ...label, color: C.green, paddingTop: 3 }}>
                          {i + 1}
                        </span>
                        <input
                          value={g.goal}
                          onChange={(e) => editGoal(i, { goal: e.target.value })}
                          aria-label={`Squad goal ${i + 1}`}
                          style={{
                            flex: 1,
                            padding: "9px 11px",
                            border: `1px solid ${C.line}`,
                            borderRadius: 6,
                            background: C.field,
                            fontSize: 13,
                            color: C.ink,
                            fontFamily: UI,
                            outline: "none",
                          }}
                        />
                      </div>
                      <div style={{ paddingLeft: 31, marginTop: 6 }}>
                        <span style={{ ...label, marginRight: 7 }}>Evidence</span>
                        <span
                          style={{ fontSize: 12, color: C.warm, lineHeight: 1.5 }}
                        >
                          {g.evidence}
                        </span>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() =>
                      onGoalsChange([...squadGoals, { goal: "", evidence: "" }])
                    }
                    style={dashedButton}
                  >
                    + Add a goal
                  </button>
                </>
              ) : (
                <Empty>
                  Two to three goals, generated from the convergence.
                  <br />
                  <span style={{ fontSize: 11.5 }}>
                    You can edit every one before the briefing.
                  </span>
                </Empty>
              )}
            </Card>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 14,
              position: "sticky",
              top: 16,
            }}
          >
            <Card title="Synthesis prompt">
              <PromptBox
                value={prompts.synthesis}
                onChange={(v) => setPrompt("synthesis", v)}
              />
              <button
                onClick={synthesise}
                disabled={busy === "synthesis"}
                style={{
                  ...primaryButton,
                  marginTop: 9,
                  opacity: busy === "synthesis" ? 0.55 : 1,
                }}
              >
                {busy === "synthesis"
                  ? "Reading answers…"
                  : teamPicture
                  ? "Run again"
                  : "Build the picture"}
              </button>
            </Card>

            <Card title="Squad goals prompt">
              <PromptBox
                value={prompts.squadGoals}
                onChange={(v) => setPrompt("squadGoals", v)}
                minHeight={112}
              />
              <button
                onClick={proposeGoals}
                disabled={busy === "goals" || !teamPicture}
                style={{
                  ...primaryButton,
                  marginTop: 9,
                  background: teamPicture ? C.green : C.sand2,
                  color: teamPicture ? "#fff" : C.warmLt,
                  cursor: teamPicture ? "pointer" : "not-allowed",
                  opacity: busy === "goals" ? 0.55 : 1,
                }}
              >
                {busy === "goals"
                  ? "Drafting…"
                  : squadGoals.length
                  ? "Run again"
                  : "Propose goals"}
              </button>
              {!teamPicture && (
                <Footnote>
                  Build the picture first — goals come from the convergence.
                </Footnote>
              )}
            </Card>

            {squadGoals.length > 0 && (
              <button
                onClick={onCarryForward}
                style={{ ...primaryButton, background: C.ink }}
              >
                Carry into the briefing →
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- sub-components ---------- */

function ViewToggle({
  view,
  onChange,
}: {
  view: View;
  onChange: (v: View) => void;
}) {
  const options: [View, string][] = [
    ["individuals", "Individuals"],
    ["team", "Team picture"],
  ];

  return (
    <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
      {options.map(([key, text]) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          style={{
            padding: "7px 15px",
            borderRadius: 7,
            cursor: "pointer",
            fontSize: 12.5,
            fontWeight: 500,
            fontFamily: UI,
            background: view === key ? C.green : "transparent",
            color: view === key ? "#fff" : C.warm,
            border: view === key ? "none" : `1px solid ${C.line}`,
          }}
        >
          {text}
        </button>
      ))}
      <span
        style={{ fontSize: 12, color: C.warmLt, alignSelf: "center", marginLeft: 4 }}
      >
        {view === "individuals"
          ? "what each person said"
          : "what the crew converges on"}
      </span>
    </div>
  );
}

function DepthToggle({
  depth,
  canDistil,
  onChange,
}: {
  depth: Depth;
  canDistil: boolean;
  onChange: (d: Depth) => void;
}) {
  const options: [Depth, string][] = [
    ["full", "Full"],
    ["distilled", "Distilled"],
  ];

  return (
    <div style={{ display: "flex", gap: 4 }}>
      {options.map(([key, text]) => {
        const disabled = key === "distilled" && !canDistil;
        return (
          <button
            key={key}
            onClick={() => !disabled && onChange(key)}
            disabled={disabled}
            style={{
              padding: "5px 12px",
              borderRadius: 6,
              cursor: disabled ? "not-allowed" : "pointer",
              fontSize: 11.5,
              fontFamily: UI,
              background: depth === key ? C.sand : "transparent",
              color: disabled ? C.line : depth === key ? C.ink : C.warmLt,
              border: `1px solid ${depth === key ? C.line : "transparent"}`,
              fontWeight: depth === key ? 500 : 400,
            }}
          >
            {text}
          </button>
        );
      })}
    </div>
  );
}

function CrewRow({
  sailor,
  response,
  active,
  onSelect,
}: {
  sailor: Sailor;
  response?: PrimingResponse;
  active: boolean;
  onSelect: () => void;
}) {
  const hasAnswered = Boolean(response);

  return (
    <button
      onClick={onSelect}
      disabled={!hasAnswered}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        width: "100%",
        padding: "9px 8px",
        marginBottom: 2,
        borderRadius: 6,
        textAlign: "left",
        border: "none",
        cursor: hasAnswered ? "pointer" : "default",
        background: active ? C.sand : "transparent",
        opacity: hasAnswered ? 1 : 0.55,
        fontFamily: UI,
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: 7,
          flexShrink: 0,
          background: hasAnswered ? C.green : C.warmLt,
        }}
      />
      <span style={{ flex: 1 }}>
        <span
          style={{ fontSize: 12.5, color: C.ink, fontWeight: active ? 600 : 500 }}
        >
          {sailor.name}
        </span>
        <span style={{ display: "block", fontSize: 11, color: C.warmLt }}>
          {sailor.role}
        </span>
      </span>
    </button>
  );
}

function PromptBox({
  value,
  onChange,
  minHeight = 148,
}: {
  value: string;
  onChange: (v: string) => void;
  minHeight?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: "100%",
        minHeight,
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
        margin: "8px 0 0",
      }}
    >
      {children}
    </p>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: "28px 0",
        textAlign: "center",
        color: C.warmLt,
        fontSize: 13,
        lineHeight: 1.6,
      }}
    >
      {children}
    </div>
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

const dashedButton: React.CSSProperties = {
  padding: "8px 13px",
  borderRadius: 6,
  cursor: "pointer",
  background: "transparent",
  border: `1px dashed ${C.line}`,
  color: C.warm,
  fontSize: 12,
  fontFamily: UI,
};
