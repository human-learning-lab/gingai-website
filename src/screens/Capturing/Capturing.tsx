"use client";

import React, { useMemo, useCallback, useState } from "react";
import ContextFilePreview from "@/components/ContextFilePreview";
import type { SquadGoal } from '@/lib/carriedContext';

/* ============================================================
   Ginga — Capture
   Squad goals are the yardstick. Questions steer each sailor
   toward their own area rather than a generic "how was it".

   Priming data — serving each sailor their own numbers before
   they speak — is modelled but not live. The shape is here so
   it can be wired when Nico's feed is defined.
   ============================================================ */

/* ---------- types ---------- */

export type SailorId = string;

export interface Sailor {
  id: SailorId;
  name: string;
  role: string;
}

/** One number served to a sailor before they answer. */
export interface PrimingMetric {
  /** e.g. "Mode changes at trigger" */
  key: string;
  /** e.g. "4 of 6" */
  value: string;
  /** Context that makes the number mean something, e.g. "2 above 14 kts". */
  note?: string;
}

interface QuestionSet {
  prompt: string;
  questions: string[];
}

/** Team set plus an optional override per sailor. */
export interface CaptureValue {
  /** The set everyone gets unless they have their own. */
  teamQuestions: string[];
  /** Per-sailor overrides. Absent means they fall back to the team set. */
  personal: Record<SailorId, QuestionSet>;
  /** Prompt for generating questions for entire team **/
  teamPrompt: string;
}

export type Scope = "team" | "personal";

export interface CaptureProps {
  sailors: Sailor[];

  /** Squad goals as agreed in the briefing — the yardstick for tonight. */
  squadGoals: SquadGoal[];
  /** Each sailor's own goal from this morning's priming. */
  ownGoals: Record<SailorId, string>;
  /**
   * What each sailor would be shown before they speak.
   * Not live — pass an empty map until the feed is defined.
   */
  primingData?: Record<SailorId, PrimingMetric[]>;
  /** Set true once priming data is actually being served. */
  primingDataLive?: boolean;

  value: CaptureValue;
  onChange: (next: CaptureValue) => void;

  /** Ask the model for questions. Given goals, the sailor and their role. */
  onGenerate: (args: {
    prompt: string;
    scope: Scope;
    sailor?: Sailor;
    squadGoals: SquadGoal[];
    ownGoal?: string;
  }) => Promise<string[]>;

  onSend: (recipients: SailorId[], scope: Scope) => Promise<void> | void;

  /** Questions restored by "reset to default". */
  defaultQuestions: string[];
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
  mustard: "#B8912F",
  mustardLt: "#FAF3E4",
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

export default function Capture({
  sailors,
  squadGoals,
  ownGoals,
  value,
  onChange,
  onGenerate,
  onSend,
  defaultQuestions,
}: CaptureProps) {
  const [scope, setScope] = useState<Scope>("team");
  const [activeSailor, setActiveSailor] = useState<string>(
    sailors[0]?.name ?? ""
  );
  const [recipients, setRecipients] = useState<string[]>(
    sailors.map((s) => s.name)
  );
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const isTeam = scope === "team";
  const sailor = useMemo(
    () => sailors.find((s) => s.name === activeSailor),
    [sailors, activeSailor]
  );

  const ownSetCount = sailors.length;
  //const metrics = primingData[activeSailor] ?? [];
  //const dataAttached = value.attachDataFor.includes(activeSailor);

  /* `value` is the single source of truth. An absent personal entry means the
     sailor falls back to the team set — so entries are created on first edit,
     never pre-filled. */
  const personalSet = value.personal[activeSailor];

  const current_questions = isTeam
    ? value.teamQuestions
    : personalSet?.questions ?? value.teamQuestions;
  const current_prompt = isTeam
    ? value.teamPrompt
    : personalSet?.prompt ?? value.teamPrompt;

  /** Write a question list into whichever scope is active. */
  const setCurrentQuestions = (next: string[]) => {
    if (isTeam) {
      onChange({ ...value, teamQuestions: next });
    } else {
      onChange({
        ...value,
        personal: {
          ...value.personal,
          [activeSailor]: { questions: next, prompt: current_prompt },
        },
      });
    }
  };

  const setCurrentPrompt = (next: string) => {
    if (isTeam) {
      onChange({ ...value, teamPrompt: next });
    } else {
      onChange({
        ...value,
        personal: {
          ...value.personal,
          [activeSailor]: { questions: current_questions, prompt: next },
        },
      });
    }
  };

  const editQuestion = (index: number, text: string) =>
    setCurrentQuestions(current_questions.map((q, i) => (i === index ? text : q)));

  const moveQuestion = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= current_questions.length) return;
    const next = [...current_questions];
    [next[index], next[target]] = [next[target], next[index]];
    setCurrentQuestions(next);
  };

  const generate = async () => {
    setGenerating(true);
    try {
      setCurrentQuestions(
        await onGenerate({
          prompt: current_prompt,
          scope,
          sailor: isTeam ? undefined : sailor,
          squadGoals,
          ownGoal: isTeam ? undefined : ownGoals[activeSailor],
        }),
      );
    } finally {
      setGenerating(false);
    }
  };

  const send = async () => {
    if (!recipients.length) return;
    setSending(true);
    try {
      await onSend(recipients, scope);
      setSent(true);
    } finally {
      setSending(false);
    }
  };

  const toggleRecipient = (id: SailorId) =>
    setRecipients((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  /* ---------- render ---------- */

  return (
    <div style={{ fontFamily: UI, color: C.ink }}>
      <header style={{ marginBottom: 16 }}>
        <h1 style={{ fontFamily: DISPLAY, fontSize: 22, fontWeight: 700, margin: 0 }}>
          Capture
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
          Sent about fifteen minutes after docking. Questions steer each sailor
          toward their own area and the squad goals — never a generic
          &ldquo;how was it&rdquo;.
        </p>
      </header>

      <div className="phase-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,1fr) minmax(520px, 620px)",
          gap: 16,
          alignItems: "start",
        }}
      >
        <div className="cap-col" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="cap-yardstick">
          <Card title="The yardstick — squad goals from the briefing">
            {squadGoals.map((goal, i) => (
              <div
                key={i}
                style={{
                  padding: "8px 0",
                  borderBottom:
                    i < squadGoals.length - 1 ? `1px solid ${C.line}` : "none",
                }}
              >
                <div style={{ display: "flex", gap: 9, fontSize: 13, lineHeight: 1.5 }}>
                  <span style={{ ...label, color: C.green, paddingTop: 2 }}>
                    {i + 1}
                  </span>
                  {goal.text}
                </div>

                {/* What the room did with the goal it was given — reworded,
                    added, or left unaddressed. Absent means carried through
                    unchanged, so there is nothing to note. */}
                {goal.change && (
                  <div
                    style={{
                      marginLeft: 30,
                      marginTop: 6,
                      padding: "8px 10px",
                      background: C.sand,
                      borderRadius: 6,
                      fontSize: 11.5,
                      color: C.warm,
                      lineHeight: 1.5,
                    }}
                  >
                    {goal.change}
                  </div>
                )}
              </div>
            ))}
            <Footnote>
              These drove execution. Tonight they become the measure — and they
              carry into the debrief.
            </Footnote>
          </Card>
          </div>

          <div className="cap-scope">
            <ScopeToggle scope={scope} onChange={setScope} />
          </div>

          {!isTeam && (
            /* Keeps the column's own spacing: wrapping two siblings in a plain
               div would drop the flex gap that was between them. */
            <div className="cap-picker" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <SailorPicker
                sailors={sailors}
                active={activeSailor}
                onSelect={setActiveSailor}
              />

              {ownGoals[activeSailor] && (
                <div
                  style={{
                    padding: "11px 13px",
                    background: C.sand,
                    borderLeft: `2px solid ${C.green}`,
                    borderRadius: "0 8px 8px 0",
                  }}
                >
                  <div style={{ ...label, marginBottom: 4 }}>
                    {sailor?.name}&rsquo;s goal this morning
                  </div>
                  <div style={{ fontSize: 13, lineHeight: 1.55 }}>
                    {ownGoals[activeSailor]}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* What the questions will be written against — the squad's file in
              team scope, the selected sailor's in personal. Same panel as the
              skeleton brief, so both screens show context the same way. */}
          <div className="cap-context">
            {isTeam ? (
              <ContextFilePreview label="Team context" endpoint="/api/team-profile" />
            ) : (
              activeSailor && (
                <ContextFilePreview
                  label={`Context · ${activeSailor}`}
                  endpoint={`/api/sailor-profile?sailor=${encodeURIComponent(activeSailor)}`}
                />
              )
            )}
          </div>

          <div className="cap-questions">
          <Card
            title={
              isTeam ? "Questions — everyone" : `Questions — ${sailor?.name}`
            }
          >
            {current_questions.map((question, i) => (
              <QuestionRow
                key={i}
                index={i}
                value={question}
                isFirst={i === 0}
                isLast={i === current_questions.length - 1}
                onEdit={(text) => editQuestion(i, text)}
                onMove={(delta) => moveQuestion(i, delta)}
              />
            ))}
            <div style={{ display: "flex", gap: 8, marginTop: 11 }}>
              <button
                onClick={() => setCurrentQuestions([...defaultQuestions])}
                style={quietButton}
              >
                Reset to default set
              </button>
            </div>
          </Card>
          </div>

        </div>

        <aside className="phase-sticky cap-aside"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 14,
            position: "sticky",
            top: 16,
            /* Cap the column to the viewport and let it scroll inside,
               so the send button is always reachable on tall screens. */
            maxHeight: "calc(100vh - 32px)",
            minHeight: 0,
          }}
        >
          {/* Cards scroll; the send block below stays pinned. */}
          <div
            className="cap-asiderow"
            style={{
              display: "flex",
              gap: 14,
              overflowY: "auto",
              minHeight: 0,
              flex: "1 1 auto",
              alignItems: "flex-start",
            }}
          >
            <div className="cap-prompt" style={{ flex: "1 1 0", minWidth: 0 }}>
            <Card title="Capture prompt">
            <p
              style={{
                fontSize: 12,
                color: C.warm,
                lineHeight: 1.55,
                margin: "0 0 10px",
              }}
            >
              How Ginga writes the questions. It is given the squad goals, the
              sailor&rsquo;s own goal and their role — so the questions land in
              their area, not in general.
            </p>

            <textarea
              value={current_prompt}
              onChange={(e) => setCurrentPrompt(e.target.value)}
              style={{
                width: "100%",
                minHeight: 176,
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
              onClick={generate}
              disabled={generating}
              style={{
                ...primaryButton,
                marginTop: 9,
                opacity: generating ? 0.5 : 1,
                cursor:
                  generating ? "not-allowed" : "pointer",
              }}
            >
              {generating ? "Writing…" : "Generate questions"}
            </button>

            <Footnote>
              Replaces the questions above — you can still edit every one.
            </Footnote>
          </Card>

            </div>

            <div className="cap-send" style={{ flex: "1 1 0", minWidth: 0 }}>
          <Card title={isTeam ? "Send to" : "What each sailor gets"}>
            {!isTeam && (
              <p
                style={{
                  fontSize: 12,
                  color: C.warm,
                  lineHeight: 1.55,
                  margin: "0 0 11px",
                }}
              >
                Everyone gets their own version. Anyone without a set of their
                own falls back to the default — click a name to write theirs.
              </p>
            )}

            {sailors.map((s) => (
              <RecipientRow
                key={s.name}
                sailor={s}
                checked={recipients.includes(s.name)}
                showSetStatus={!isTeam}
                hasOwnSet={Boolean(value.personal[s.name])}
                onToggle={() => toggleRecipient(s.name)}
                onEditTheirs={() => setActiveSailor(s.name)}
              />
            ))}

            <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
              <button
                onClick={() => setRecipients(sailors.map((s) => s.name))}
                style={quietButton}
              >
                All
              </button>
              <button onClick={() => setRecipients([])} style={quietButton}>
                None
              </button>
            </div>

            {!isTeam && (
              <Footnote>
                {ownSetCount} of {sailors.length} have a set of their own.
              </Footnote>
            )}
          </Card>
            </div>
          </div>

          <div className="cap-sendbtn" style={{ flexShrink: 0 }}>
            <button
              onClick={send}
              disabled={!recipients.length || sending}
              style={{
                ...primaryButton,
                background: recipients.length ? C.green : C.sand2,
                color: recipients.length ? "#fff" : C.warmLt,
                cursor:
                  recipients.length && !sending ? "pointer" : "not-allowed",
              }}
            >
              {sending
                ? "Sending…"
                : sent
                ? "Sent ✓"
                : isTeam
                ? `Send to ${recipients.length}`
                : `Send ${recipients.length} personal sets`}
            </button>

            <Footnote>
              Opens WhatsApp with a personal link each. They tap it on the dock —
              no login.
            </Footnote>
          </div>

          {sent && (
            <div
              style={{
                flexShrink: 0,
                padding: "11px 12px",
                background: C.greenLt,
                borderRadius: 8,
                fontSize: 11.5,
                color: C.greenDk,
                lineHeight: 1.55,
              }}
            >
              Answers land in Captures in. Nothing is synthesised until you ask
              for it.
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

/* ---------- sub-components ---------- */

function PrimingDataPanel({
  isTeam,
  live,
  sailorName,
  metrics,
  attached,
  onToggle,
}: {
  isTeam: boolean;
  live: boolean;
  sailorName?: string;
  metrics: PrimingMetric[];
  attached: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      style={{
        border: live ? `1px solid ${C.line}` : `1.5px dashed ${C.line}`,
        borderRadius: 9,
        padding: 15,
        background: live ? C.field : "transparent",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 10,
        }}
      >
        <div>
          <h2 style={{ ...label, margin: 0 }}>
            Priming data — served before they speak
          </h2>
          <p
            style={{
              fontSize: 12,
              color: C.warm,
              margin: "6px 0 0",
              lineHeight: 1.55,
              maxWidth: 460,
            }}
          >
            Show each sailor their own numbers on the capture page, so the answer
            is specific rather than from memory. Ginga pulls what matters for
            their role.
          </p>
        </div>
        {!live && (
          <span
            style={{
              ...label,
              color: C.mustard,
              background: C.mustardLt,
              padding: "4px 9px",
              borderRadius: 5,
              whiteSpace: "nowrap",
            }}
          >
            Not live yet
          </span>
        )}
      </div>

      {isTeam ? (
        <p
          style={{
            fontSize: 12.5,
            color: C.warmLt,
            lineHeight: 1.55,
            margin: "12px 0 0",
          }}
        >
          Switch to Personal to see what each sailor would be shown.
        </p>
      ) : metrics.length ? (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))",
              gap: 9,
              marginTop: 4,
            }}
          >
            {metrics.map((m) => (
              <div
                key={m.key}
                style={{ padding: "10px 12px", background: C.sand, borderRadius: 7 }}
              >
                <div style={{ ...label, marginBottom: 4 }}>{m.key}</div>
                <div
                  style={{
                    fontFamily: DISPLAY,
                    fontSize: 20,
                    fontWeight: 600,
                    lineHeight: 1.1,
                  }}
                >
                  {m.value}
                </div>
                {m.note && (
                  <div style={{ fontSize: 11, color: C.warmLt, marginTop: 3 }}>
                    {m.note}
                  </div>
                )}
              </div>
            ))}
          </div>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              marginTop: 13,
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={attached}
              onChange={onToggle}
              style={{ width: 15, height: 15, accentColor: C.green, cursor: "pointer" }}
            />
            <span style={{ fontSize: 12.5 }}>
              Attach these to {sailorName}&rsquo;s capture page
            </span>
          </label>

          {!live && (
            <Footnote>
              Which numbers appear per role is still to be defined. Nico&rsquo;s
              feed is the source.
            </Footnote>
          )}
        </>
      ) : (
        <p
          style={{
            fontSize: 12.5,
            color: C.warmLt,
            lineHeight: 1.55,
            margin: "12px 0 0",
          }}
        >
          Nothing mapped for this role yet.
        </p>
      )}
    </div>
  );
}

function ScopeToggle({
  scope,
  onChange,
}: {
  scope: Scope;
  onChange: (s: Scope) => void;
}) {
  const options: [Scope, string][] = [
    ["team", "Everyone"],
    ["personal", "Personal"],
  ];

  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
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
            background: scope === key ? C.green : "transparent",
            color: scope === key ? "#fff" : C.warm,
            border: scope === key ? "none" : `1px solid ${C.line}`,
          }}
        >
          {text}
        </button>
      ))}
      <span style={{ fontSize: 12, color: C.warmLt, marginLeft: 4 }}>
        {scope === "team"
          ? "one set for the whole crew"
          : "steered to one sailor's own goal and role"}
      </span>
    </div>
  );
}

function SailorPicker({
  sailors,
  active,
  onSelect,
}: {
  sailors: Sailor[];
  active: SailorId;
  onSelect: (id: SailorId) => void;
}) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {sailors.map((s) => (
        <button
          key={s.name}
          onClick={() => onSelect(s.name)}
          style={{
            padding: "8px 13px",
            borderRadius: 7,
            cursor: "pointer",
            textAlign: "left",
            fontFamily: UI,
            background: active === s.name ? C.sand : "transparent",
            border: `1px solid ${active === s.name ? C.green : C.line}`,
          }}
        >
          <span
            style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: C.ink }}
          >
            {s.name}
          </span>
          <span style={{ display: "block", fontSize: 11, color: C.warmLt }}>
            {s.role}
          </span>
        </button>
      ))}
    </div>
  );
}

function QuestionRow({
  index,
  value,
  isFirst,
  isLast,
  onEdit,
  onMove,
}: {
  index: number;
  value: string;
  isFirst: boolean;
  isLast: boolean;
  onEdit: (text: string) => void;
  onMove: (delta: number) => void;
}) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "6px 0" }}>
      <span style={{ ...label, color: C.green, width: 22 }}>Q{index + 1}</span>
      <input
        value={value}
        onChange={(e) => onEdit(e.target.value)}
        placeholder="Write the question…"
        aria-label={`Question ${index + 1}`}
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
      <IconButton onClick={() => onMove(-1)} disabled={isFirst} label="Move up">
        ↑
      </IconButton>
      <IconButton onClick={() => onMove(1)} disabled={isLast} label="Move down">
        ↓
      </IconButton>
    </div>
  );
}

function RecipientRow({
  sailor,
  checked,
  showSetStatus,
  hasOwnSet,
  onToggle,
  onEditTheirs,
}: {
  sailor: Sailor;
  checked: boolean;
  showSetStatus: boolean;
  hasOwnSet: boolean;
  onToggle: () => void;
  onEditTheirs: () => void;
}) {
  const id = `recipient-${sailor.name}`;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 9,
        padding: "7px 0",
        borderBottom: `1px solid ${C.line}`,
      }}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        style={{ width: 15, height: 15, accentColor: C.green, cursor: "pointer" }}
      />
      <label htmlFor={id} style={{ flex: 1, cursor: "pointer" }}>
        <span style={{ fontSize: 12.5, color: C.ink, fontWeight: 500 }}>
          {sailor.name}
        </span>
        <span style={{ display: "block", fontSize: 11, color: C.warmLt }}>
          {sailor.role}
        </span>
      </label>

      {showSetStatus && (
        <button
          onClick={onEditTheirs}
          style={{
            ...label,
            fontSize: 10,
            padding: "3px 8px",
            borderRadius: 5,
            cursor: "pointer",
            color: hasOwnSet ? C.greenDk : C.warmLt,
            background: hasOwnSet ? C.greenLt : "transparent",
            border: hasOwnSet ? "none" : `1px solid ${C.line}`,
          }}
        >
          {hasOwnSet ? "Own set" : "Default"}
        </button>
      )}
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

function IconButton({
  children,
  onClick,
  disabled,
  label: ariaLabel,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      style={{
        width: 26,
        height: 26,
        borderRadius: 5,
        flexShrink: 0,
        cursor: disabled ? "default" : "pointer",
        background: "transparent",
        border: `1px solid ${C.line}`,
        color: disabled ? C.line : C.warm,
        fontSize: 12,
        lineHeight: 1,
        fontFamily: UI,
      }}
    >
      {children}
    </button>
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

const quietButton: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 6,
  cursor: "pointer",
  background: "transparent",
  border: "none",
  color: C.warmLt,
  fontSize: 12,
  fontFamily: UI,
};
