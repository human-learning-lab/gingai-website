"use client";

import React, { useCallback, useMemo, useState } from "react";
import { ROLES } from '@/data/roles';
import ContextFilePreview from "@/components/ContextFilePreview";
import { Sailor } from "@/types"

/* ============================================================
   Ginga — Skeleton brief
   Question builder, prompt editor, team vs personal sets,
   recipient selection and send.

   Data comes in through props; every change is reported back
   through callbacks. The component owns no persistence.
   ============================================================ */

/* ---------- types ---------- */

export type SailorId = string;

interface QuestionSet {
  prompt: string;
  questions: string[];
}

/** Team set plus an optional override per sailor. */
export interface SkeletonBriefValue {
  /** The set everyone gets unless they have their own. */
  teamQuestions: string[];
  /** Per-sailor overrides. Absent means they fall back to the team set. */
  personal: Record<SailorId, QuestionSet>;
  /** Prompt for generating questions for entire team **/
  teamPrompt: string;
}

export type Scope = "team" | "personal";

export interface SkeletonBriefProps {
  runId: string;
  sailors: Sailor[];
  value: SkeletonBriefValue;
  onChange: (next: SkeletonBriefValue) => void;
  /** Called when the coach sends. Resolve when the send has been handed off. */
  onSend: (runId: string, recipients: SailorId[], scope: Scope) => Promise<void> | void;
  /** Ask the model for questions from a prompt. */
  onGenerate: (args: {
    prompt: string;
    scope: Scope;
    sailor?: Sailor;
  }) => Promise<string[]>;
  /** Questions restored by "reset to default". */
  defaultQuestions: string[];
  /** Set once the run has been sent — enables the version-2 notice. */
  sentAt?: Date | null;
  /** True once any sailor has answered, so edits create a new version. */
  hasResponses?: boolean;
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

export default function SkeletonBrief({
  runId,
  sailors,
  value,
  onChange,
  onSend,
  onGenerate,
  defaultQuestions,
  sentAt = null,
  hasResponses = false,
}: SkeletonBriefProps) {
  const [scope, setScope] = useState<Scope>("team");
  const [activeSailor, setActiveSailor] = useState<SailorId>(
    sailors[0]?.name ?? ""
  );
  const [recipients, setRecipients] = useState<SailorId[]>(
    sailors.map((s) => s.name)
  );
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sent, setSent] = useState(Boolean(sentAt));

  const isTeam = scope === "team";
  const sailor = useMemo(
    () => sailors.find((s) => s.name === activeSailor),
    [sailors, activeSailor]
  );

  /* `value` is the single source of truth. An absent personal entry means the
     sailor falls back to the team set, per SkeletonBriefValue — so entries are
     created on first edit, never pre-filled. */
  const personalSet = value.personal[activeSailor];

  const current_questions = isTeam
    ? value.teamQuestions
    : personalSet?.questions ?? value.teamQuestions;
  const current_prompt = isTeam
    ? value.teamPrompt
    : personalSet?.prompt ?? value.teamPrompt;

  /* ---------- mutations ---------- */

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
    setGenerateError(null);
    try {
      setCurrentQuestions(
        await onGenerate({
          prompt: current_prompt,
          scope,
          sailor: isTeam ? undefined : sailor,
        }),
      );
    } catch (e) {
      // Personal generation fails when the sailor has no profile on file.
      // Surfacing it beats an unhandled rejection and a button that just stops.
      setGenerateError(e instanceof Error ? e.message : 'Could not generate questions');
    } finally {
      setGenerating(false);
    }
  };

  const send = async () => {
    if (!recipients.length) return;
    setSending(true);
    setSendError(null);
    try {
      await onSend(runId, recipients, scope);
      setSent(true);
    } catch (e) {
      // A failed send must not read as a successful one — the recipient would
      // open a link serving the previous question set.
      setSendError(e instanceof Error ? e.message : "Could not send");
    } finally {
      setSending(false);
    }
  };

  const toggleRecipient = (id: SailorId) =>
    setRecipients((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const showVersionNotice = sent && hasResponses;

  /* ---------- render ---------- */

  return (
    <div style={{ fontFamily: UI, color: C.ink }}>
      <header style={{ marginBottom: 16 }}>
        <h1
          style={{
            fontFamily: DISPLAY,
            fontSize: 22,
            fontWeight: 700,
            color: C.ink,
            margin: 0,
          }}
        >
          Skeleton brief
        </h1>
        <p
          style={{
            fontSize: 12.5,
            color: C.warm,
            margin: "4px 0 0",
            lineHeight: 1.55,
            maxWidth: 640,
          }}
        >
          Sent the night before. Questions go out with it so each sailor primes
          themselves — the briefing then presents that thinking rather than
          generating it.
        </p>
      </header>

      <div className="phase-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,1fr) 236px",
          gap: 16,
          alignItems: "start",
        }}
      >
        <div className="sb-col" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="sb-scope">
            <ScopeToggle scope={scope} onChange={setScope} />
          </div>

          {!isTeam && (
            <div className="sb-picker">
              <SailorPicker
                sailors={sailors}
                active={activeSailor}
                onSelect={setActiveSailor}
              />
            </div>
          )}

          {/* What the questions will be written against — the squad's file in
              team scope, the selected sailor's in personal. */}
          <div className="sb-context">
            {isTeam ? (
              <ContextFilePreview label="Team context" endpoint="/api/team-profile" />
            ) : (
              activeSailor && (
                <ContextFilePreview
                  label={`Profile · ${activeSailor}`}
                  endpoint={`/api/sailor-profile?sailor=${encodeURIComponent(activeSailor)}`}
                />
              )
            )}
          </div>

          <Card
            className="sb-questions"
            title={
              isTeam ? "Questions — everyone" : `Questions — ${sailor?.name}`
            }
          >
            {current_questions.map((question, index) => (
              <QuestionRow
                key={index}
                index={index}
                value={question}
                isFirst={index === 0}
                isLast={index === current_questions.length - 1}
                onEdit={(text) => editQuestion(index, text)}
                onMove={(delta) => moveQuestion(index, delta)}
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

          <Card
            className="sb-prompt"
            title={isTeam ? "Prompt — everyone" : `Prompt — ${sailor?.name}`}
          >
            <p
              style={{
                fontSize: 12,
                color: C.warm,
                lineHeight: 1.55,
                margin: "0 0 10px",
              }}
            >
              {isTeam
                ? "How Ginga writes the questions when you generate them. Edit it to change the shape of what comes out."
                : "What Ginga knows about how this sailor thinks. Used when generating their questions, so they land in their own language."}
            </p>

            <textarea
              value={current_prompt}
              onChange={(e) => setCurrentPrompt(e.target.value)}
              placeholder={
                isTeam
                  ? "Describe how the questions should be written…"
                  : "Describe how this sailor thinks and what to ask them about…"
              }
              style={{
                width: "100%",
                minHeight: 132,
                padding: "11px 12px",
                border: `1px solid ${C.line}`,
                borderRadius: 7,
                background: C.field,
                fontSize: 12.5,
                lineHeight: 1.6,
                color: C.ink,
                resize: "vertical",
                fontFamily: MONO,
                outline: "none",
              }}
            />

            <div
              style={{
                display: "flex",
                gap: 8,
                marginTop: 10,
                alignItems: "center",
              }}
            >
              <button
                onClick={generate}
                disabled={generating}
                style={{
                  ...primaryButton,
                  width: "auto",
                  padding: "9px 16px",
                  fontSize: 12.5,
                  opacity: generating ? 0.5 : 1,
                  cursor:
                    generating
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                {generating ? "Generating…" : "Generate questions from prompt"}
              </button>
              <span style={{ fontSize: 11.5, color: C.warmLt }}>
                replaces the questions above — you can still edit them
              </span>
            </div>
            {generateError && (
              <p
                role="alert"
                style={{
                  margin: "10px 0 0",
                  fontSize: 12.5,
                  lineHeight: 1.45,
                  color: "#C4392C",
                }}
              >
                {generateError}
              </p>
            )}
          </Card>
        </div>

        <aside className="phase-sticky sb-send"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 14,
            position: "sticky",
            top: 16,
          }}
        >
          <Card title="Send to">
            {sailors.map((s) => (
              <RecipientRow
                key={s.name}
                sailor={s}
                checked={recipients.includes(s.name)}
                hasOwnPrompt={
                  !isTeam && Boolean(value.personal[s.name]?.prompt?.trim())
                }
                onToggle={() => toggleRecipient(s.name)}
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
          </Card>

          <div>
            <button
              onClick={send}
              disabled={!recipients.length || sending}
              style={{
                ...primaryButton,
                background: recipients.length ? C.green : C.sand2,
                color: recipients.length ? "#fff" : C.warmLt,
                cursor: recipients.length && !sending ? "pointer" : "not-allowed",
              }}
            >
              {sending
                ? "Sending…"
                : sent
                ? "Sent ✓"
                : `Send to ${recipients.length}`}
            </button>

            {sendError && (
              <p
                role="alert"
                style={{
                  fontSize: 12,
                  color: "#C4392C",
                  lineHeight: 1.5,
                  margin: "9px 0 0",
                }}
              >
                {sendError}
              </p>
            )}

            <p
              style={{
                fontSize: 11.5,
                color: C.warm,
                lineHeight: 1.55,
                margin: "9px 0 0",
              }}
            >
              Opens WhatsApp with a personal link for each sailor. One tap each —
              no business account, no login for them.
            </p>
          </div>

          {showVersionNotice && (
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
              Question set frozen as version 1. Edits from here create version 2
              and are kept apart in the synthesis.
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

/* ---------- sub-components ---------- */

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
          : "a set tuned to one sailor"}
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
            style={{
              display: "block",
              fontSize: 12.5,
              fontWeight: 600,
              color: C.ink,
            }}
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
  hasOwnPrompt,
  onToggle,
}: {
  sailor: Sailor;
  checked: boolean;
  hasOwnPrompt: boolean;
  onToggle: () => void;
}) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        gap: 9,
        padding: "7px 0",
        borderBottom: `1px solid ${C.line}`,
        cursor: "pointer",
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        style={{ width: 15, height: 15, accentColor: C.green, cursor: "pointer" }}
      />
      <span style={{ flex: 1 }}>
        <span style={{ fontSize: 12.5, color: C.ink, fontWeight: 500 }}>
          {sailor.name}
        </span>
        <span style={{ display: "block", fontSize: 11, color: C.warmLt }}>
          {sailor.role}
        </span>
      </span>
      {hasOwnPrompt && (
        <span style={{ ...label, color: C.green, fontSize: 10 }}>Own</span>
      )}
    </label>
  );
}

function Card({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  /** Lets the mobile running order address this block. */
  className?: string;
}) {
  return (
    <section
      className={className}
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
  padding: "12px 0",
  borderRadius: 8,
  border: "none",
  cursor: "pointer",
  background: C.green,
  color: "#fff",
  fontSize: 13.5,
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
