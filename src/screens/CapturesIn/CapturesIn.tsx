"use client";

import React, { useMemo, useState } from "react";

/* ============================================================
   Ginga — Captures in
   What each sailor said, the same distilled, and what the team
   said together. Same shape as Priming in — the difference is
   that now there are goals to measure against.
   ============================================================ */

/* ---------- types ---------- */

export type SailorId = string;

export interface Sailor {
  id: SailorId;
  name: string;
  role: string;
}

export interface CaptureResponse {
  id: number;
  kind: string;
  questions: string[];
  responses: string[];
  recipient: SailorId;
  /** Local time it arrived, e.g. "18:34". */
  updated_at: string;
  /** One condensed line per question, in question order. Absent until distilled. */
  distilled?: string[];
  /** True when this sailor answered the team set rather than one of their own. */
  fromTeamSet?: boolean;
}

/** How the captures read against one squad goal. */
export interface GoalReading {
  goal: string;
  /** How many respondents addressed this goal. */
  addressedBy: number;
  /** Short verdict in the model's words, e.g. "Held where it was defined." */
  verdict: string;
  /** The evidence, quoted rather than summarised away. */
  detail: string;
}

export interface Theme {
  text: string;
  count: number;
  sailorNames: string[];
}

export interface TeamReading {
  /** e.g. "5 of 8" — always shown, never implied. */
  coverage: string;
  goals: GoalReading[];
  themes: Theme[];
  /**
   * Where accounts of the same moment differ. Left unresolved on
   * purpose — that is the debrief's job, not the synthesis's.
   */
  conflict?: string;
  /** What the crew wants carried into tomorrow. */
  tomorrow: string[];
}

export interface Prompts {
  distil: string;
  synthesis: string;
}

export interface CapturesInProps {
  sailors: Sailor[];
  responses: CaptureResponse[];

  /** As agreed in the briefing — what the captures are measured against. */
  squadGoals: string[];
  /** Each sailor's own goal from this morning, shown above their answer. */
  ownGoals: Record<SailorId, string>;

  prompts: Prompts;
  onPromptsChange: (next: Prompts) => void;

  teamReading?: TeamReading | null;

  /** Re-condense every response. Returns distilled lines keyed by sailor. */
  onDistil: (prompt: string) => Promise<Record<string, string[]>>;
  /** Build the team reading. Safe to run before everyone has answered. */
  onSynthesise: (prompt: string) => Promise<TeamReading>;
  /** Files the reading for the debrief to read back. Rejects if the write fails. */
  onCarryForward: () => Promise<void> | void;

  /** When the debrief starts, e.g. "19:30". Shown as context for the hurry. */
  debriefAt?: string;
}

type View = "individuals" | "team";
type Depth = "full" | "distilled";

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
  mustardLt: "#FAF3E4",
  mustardDk: "#7A5F14",
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

export default function CapturesIn({
  sailors,
  responses,
  squadGoals,
  ownGoals,
  prompts,
  onPromptsChange,
  teamReading = null,
  onDistil,
  onSynthesise,
  onCarryForward,
}: CapturesInProps) {
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
  const [busy, setBusy] = useState<"distil" | "synthesis" | "carry" | null>(null);
  const [carryState, setCarryState] = useState<"idle" | "done" | "error">("idle");
  const [carryError, setCarryError] = useState<string | null>(null);

  /* Same fix as priming in: the button used to be a bare void handler, so a
     failed write looked identical to a success. */
  const carryForward = async () => {
    setBusy("carry");
    setCarryError(null);
    try {
      await onCarryForward();
      setCarryState("done");
    } catch (e) {
      setCarryState("error");
      setCarryError(e instanceof Error ? e.message : "Could not carry the reading forward");
    } finally {
      setBusy(null);
    }
  };

  const response = byId.get(selected);
  const sailor = sailors.find((s) => s.name === selected);

  const setPrompt = (key: keyof Prompts, text: string) =>
    onPromptsChange({ ...prompts, [key]: text });

  const distil = async () => {
    setBusy("distil");
    try {
	  const distilled_resps = await onDistil(prompts.distil)
	  for(const [sailor, dist] of Object.entries(distilled_resps))
		  byId.get(sailor)!.distilled = dist;
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

  return (
    <div style={{ fontFamily: UI, color: C.ink }}>
      <header style={{ marginBottom: 16 }}>
        <h1 style={{ fontFamily: DISPLAY, fontSize: 22, fontWeight: 700, margin: 0 }}>
          Captures in
        </h1>
        <p
          style={{
            fontSize: 12.5,
            color: C.warm,
            margin: "4px 0 0",
            lineHeight: 1.55,
            maxWidth: 680,
          }}
        >
          Answers from the dock — {answered.length} of {sailors.length} in.
          {"The picture builds as they arrive rather than waiting for everyone."}
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
                style={{ fontFamily: DISPLAY, fontSize: 19, fontWeight: 600, margin: 0 }}
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
                  {response?.updated_at}
                </span>
              </h2>
              <DepthToggle
                depth={depth}
                canDistil={Boolean(response?.distilled)}
                onChange={setDepth}
              />
            </div>

            {ownGoals[selected] && (
              <div
                style={{
                  padding: "11px 13px",
                  background: C.sand,
                  borderLeft: `2px solid ${C.green}`,
                  borderRadius: "0 8px 8px 0",
                  marginBottom: 14,
                }}
              >
                <div style={{ ...label, marginBottom: 4 }}>
                  What they set out to do this morning
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.55 }}>
                  {ownGoals[selected]}
                </div>
              </div>
            )}

            {response ? (
              <Card
                title={
                  depth === "full"
                    ? `In their own words`
                    : "Distilled"
                }
                /* Which set they were actually asked. Two sailors can hold
                   different questions for the same run, and reading an answer
                   without knowing which is misleading. */
                note={
                  response.fromTeamSet === undefined
                    ? undefined
                    : response.fromTeamSet
                    ? "Team set"
                    : "Personal set"
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
						  { depth === 'distilled' && (response?.distilled ? response.distilled[i] : "—" )} 
						  { depth === 'full' && (response.responses[i] ?? "—")}
                        </div>
                      </div>
                    ))}
					{ depth === 'distilled' && (
                    <Footnote>
                      Condensed by Ginga. Their own qualifiers are kept —
                      &ldquo;half&rdquo;, &ldquo;four of six&rdquo; — never
                      rounded to achieved or not.
                    </Footnote>
					)}
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
              <Hint>
                How Ginga condenses each answer. Edit it if the distilled version
                is losing something you need.
              </Hint>
              <PromptBox
                value={prompts.distil}
                onChange={(v) => setPrompt("distil", v)}
              />
              <Button
                onClick={distil}
                disabled={busy === "distil"}
                style={{ marginTop: 9 }}
              >
                {busy === "distil" ? "Re-reading…" : "Re-distil all answers"}
              </Button>
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
            {teamReading ? (
              <>
                {/* Coverage belongs beside the title, not inside it — the
                    title was growing to "Against the squad goals · coverage
                    5 of 8" and wrapping. Card already takes a note. */}
                <Card title="Against the squad goals">
                  {teamReading.goals.map((g, i) => (
                    <div
                      key={i}
                      style={{
                        paddingBottom: 12,
                        marginBottom: 12,
                        borderBottom:
                          i < teamReading.goals.length - 1
                            ? `1px solid ${C.line}`
                            : "none",
                      }}
                    >
                      <div style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
                        <span style={{ ...label, color: C.green, paddingTop: 3 }}>
                          {i + 1}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              gap: 12,
                              fontSize: 13.5,
                              lineHeight: 1.55,
                            }}
                          >
                            <span>{g.goal}</span>

                          </div>

                          {/* Verdict and evidence in their own panel, the shape
                              the briefing's change note uses — the verdict
                              leading, the quoted detail under it. */}
                          {(g.verdict || g.detail) && (
                            <div
                              style={{
                                marginTop: 6,
                                padding: "9px 11px",
                                background: C.sand,
                                borderRadius: 6,
                                fontSize: 12,
                                color: C.warm,
                                lineHeight: 1.55,
                              }}
                            >
                              {g.verdict && (
                                <div style={{ fontWeight: 600, color: C.ink }}>
                                  {g.verdict}
                                </div>
                              )}
                              {splitQuotes(g.detail).map((q, qi) => (
                                <div
                                  key={qi}
                                  style={{
                                    marginTop: qi === 0 ? (g.verdict ? 7 : 0) : 7,
                                    padding: "8px 10px",
                                    /* Transparent rather than its own fill, so
                                       each quote sits on the same ground as the
                                       verdict above it — the border is enough
                                       to separate one voice from the next. */
                                    background: "transparent",
                                    border: `1px solid ${C.line}`,
                                    borderRadius: 5,
                                  }}
                                >
                                  {q.sailor && (
                                    <span style={{ fontWeight: 600, color: C.ink }}>
                                      {q.sailor}:{" "}
                                    </span>
                                  )}
                                  {q.quote}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </Card>

                {teamReading.themes.length > 0 && (
                  <Card title="Raised independently">
                    {teamReading.themes.map((theme) => (
                      <div
                        key={theme.text}
                        style={{ padding: "9px 0", borderBottom: `1px solid ${C.line}` }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 12,
                          }}
                        >
                          <span style={{ fontSize: 13.5 }}>{theme.text}</span>

                        </div>
                        <div
                          style={{ fontSize: 11.5, color: C.warmLt, marginTop: 4 }}
                        >
                          {theme.sailorNames.join(", ")}
                        </div>
                      </div>
                    ))}
                  </Card>
                )}

                {teamReading.conflict && (
                  <Card title="Where the accounts differ">
                    <div
                      style={{
                        padding: "11px 13px",
                        background: C.clayLt,
                        borderLeft: `2px solid ${C.clay}`,
                        borderRadius: "0 7px 7px 0",
                        fontSize: 13,
                        lineHeight: 1.65,
                      }}
                    >
                      {teamReading.conflict}
                    </div>
                    <Footnote>
                      Left unresolved on purpose. This is the debrief, not the
                      synthesis.
                    </Footnote>
                  </Card>
                )}

                {teamReading.tomorrow.length > 0 && (
                  <Card title="What they want carried into tomorrow">
                    {teamReading.tomorrow.map((item, i) => (
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
                    ))}
                  </Card>
                )}
              </>
            ) : (
              <Card title="What the team said">
                <Empty>
                  Nothing built yet.
                  <br />
                  <span style={{ fontSize: 12 }}>
                    {answered.length} answers in. Enough for a usable picture —
                    you can run it now or wait for the rest.
                  </span>
                </Empty>
              </Card>
            )}
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
              <Hint>
                How Ginga reads the captures. It has the squad goals and each
                sailor&rsquo;s own goal, so it can measure rather than summarise.
              </Hint>
              <PromptBox
                value={prompts.synthesis}
                onChange={(v) => setPrompt("synthesis", v)}
                minHeight={186}
              />
              <Button
                onClick={synthesise}
                disabled={busy === "synthesis" || answered.length === 0}
                style={{ marginTop: 9 }}
              >
                {busy === "synthesis"
                  ? "Reading captures…"
                  : teamReading
                  ? "Run again"
                  : `Build from ${answered.length} answers`}
              </Button>
              <Footnote>
                Re-runs as more answers arrive. Coverage is always stated.
              </Footnote>
            </Card>

            {teamReading && (
              <>
                <div
                  style={{
                    padding: "11px 12px",
                    background: C.mustardLt,
                    borderRadius: 8,
                    fontSize: 11.5,
                    color: C.mustardDk,
                    lineHeight: 1.55,
                  }}
                >
                  Nothing here names a person in a way that belongs to the room.
                  Anything about someone else is held back for you.
                </div>
                <Button onClick={carryForward} disabled={busy === "carry"} dark>
                  {busy === "carry"
                    ? "Filing the reading…"
                    : carryState === "done"
                    ? "Carried — carry again"
                    : "Carry into the debrief →"}
                </Button>
                {carryError && (
                  <div
                    style={{
                      padding: "9px 12px",
                      background: "#FBEFE7",
                      borderRadius: 8,
                      fontSize: 11.5,
                      color: "#C4622D",
                      lineHeight: 1.5,
                    }}
                  >
                    {carryError}
                  </div>
                )}
              </>
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
    ["team", "What the team said"],
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
          : "measured against the goals"}
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
        const disabled = false;
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
  response?: CaptureResponse;
  active: boolean;
  onSelect: () => void;
}) {
  const answered = Boolean(response);

  return (
    <button
      onClick={onSelect}
      disabled={!answered}
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
        cursor: answered ? "pointer" : "default",
        background: active ? C.sand : "transparent",
        opacity: answered ? 1 : 0.55,
        fontFamily: UI,
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: 7,
          flexShrink: 0,
          background: answered ? C.green : C.warmLt,
        }}
      />
      <span style={{ flex: 1 }}>
        <span style={{ fontSize: 12.5, color: C.ink, fontWeight: active ? 600 : 500 }}>
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
  minHeight = 152,
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
  note,
  children,
}: {
  title: string;
  /** Small right-aligned qualifier on the title row. */
  note?: string;
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
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 10,
          margin: "0 0 11px",
        }}
      >
        <h2 style={{ ...label, margin: 0 }}>{title}</h2>
        {note && (
          /* Two kinds of qualifier share this slot: the set marker, which reads
             as a badge, and a coverage count, which reads as a figure — the
             same mono treatment the theme counts use. */
          note === "Personal set" || note === "Team set" ? (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.07em",
                textTransform: "uppercase",
                padding: "2px 7px",
                borderRadius: 3,
                color: note === "Personal set" ? C.green : C.warm,
                border: `1px solid ${note === "Personal set" ? C.green : C.line}`,
                background: note === "Personal set" ? C.greenLt : "transparent",
                whiteSpace: "nowrap",
              }}
            >
              {note}
            </span>
          ) : (
            <span
              style={{
                fontFamily: MONO,
                fontSize: 11,
                color: C.warmLt,
                whiteSpace: "nowrap",
              }}
            >
              {note}
            </span>
          )
        )}
      </div>
      {children}
    </section>
  );
}

function Button({
  children,
  onClick,
  disabled,
  dark,
  style,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  dark?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
        width: "100%",
        padding: "11px 0",
        borderRadius: 8,
        border: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        background: disabled ? C.sand2 : dark ? C.ink : C.green,
        color: disabled ? C.warmLt : "#fff",
        fontSize: 13,
        fontWeight: 600,
        fontFamily: UI,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontSize: 12,
        color: C.warm,
        lineHeight: 1.55,
        margin: "0 0 10px",
      }}
    >
      {children}
    </p>
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

/**
 * One box per voice.
 *
 * The evidence arrives as a single run of `Daniel: "…" Benjamin: "…"`, which
 * reads as one account when it is two people saying the same thing
 * independently — the very thing the reading is pointing at. Split on a name
 * followed by an opening quote; anything that does not match that shape is left
 * whole rather than chopped on a guess.
 */
function splitQuotes(detail: string): { sailor?: string; quote: string }[] {
  if (!detail?.trim()) return [];

  const pattern = /([A-Z][\w'’-]*)\s*:\s*(?=[""«"])/g;
  const marks = [...detail.matchAll(pattern)];
  if (!marks.length) return [{ quote: detail.trim() }];

  const out: { sailor?: string; quote: string }[] = [];
  // Anything before the first name is preamble, kept as its own line.
  const lead = detail.slice(0, marks[0].index).trim();
  if (lead) out.push({ quote: lead });

  marks.forEach((m, i) => {
    const from = (m.index ?? 0) + m[0].length;
    const to = i + 1 < marks.length ? marks[i + 1].index : detail.length;
    const quote = detail.slice(from, to).trim();
    if (quote) out.push({ sailor: m[1], quote });
  });

  return out;
}
