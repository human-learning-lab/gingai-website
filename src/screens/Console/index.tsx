"use client";

import React from "react";

/* ============================================================
   Ginga — console shell
   Sidebar, event header and the phase rail. Every page renders
   inside this, so the navigation lives in one place and the
   response counts have somewhere to belong.
   ============================================================ */

/* ---------- types ---------- */

export type PhaseId =
  | "skeleton"
  | "priming"
  | "briefing"
  | "capture"
  | "captures"
  | "debrief";

export interface Phase {
  id: PhaseId;
  /** "01" … "06" */
  number: string;
  label: string;
  /** Shown as a badge when the phase collects answers. */
  count?: { done: number; total: number };
}

export interface EventContext {
  /** e.g. "Sassnitz" */
  venue: string;
  /** e.g. "Race day 1 · Season 6" */
  kicker: string;
  /** Set false when the day is done, to drop the live badge. */
  live?: boolean;
}

export interface User {
  name: string;
  /** Single letter for the avatar. Derived from name when absent. */
  initial?: string;
}

export interface ConsoleShellProps {
  event: EventContext;
  user: User;
  phases: Phase[];
  activePhase: PhaseId;
  onPhaseChange: (id: PhaseId) => void;
  /** Regatta/day selector, rendered in the header beside the live badge. */
  picker?: React.ReactNode;
  children: React.ReactNode;
}

/* ---------- tokens ---------- */

const C = {
  paper: "#F7F4ED",
  sand: "#EDE7DA",
  line: "#DDD5C4",
  green: "#00A651",
  greenLt: "#E6F4EA",
  greenDk: "#017C3E",
  mustard: "#B8912F",
  ink: "#1A1A18",
  warm: "#6B6459",
  warmLt: "#8E877A",
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

const PRIMARY_NAV = ["Race", "Sim", "Capture"];
const SECONDARY_NAV = ["Debrief", "Transcripts", "Library", "Summary"];

/* ---------- component ---------- */

export default function ConsoleShell({
  event,
  user,
  phases,
  activePhase,
  onPhaseChange,
  picker,
  children,
}: ConsoleShellProps) {
  /* The app shell is fixed-viewport — html and body set overflow:hidden and
     each screen scrolls its own content. The console had no scroll of its own,
     so anything past the fold was unreachable. The header stays put and the
     phase content scrolls under it. */
  return (
      <div
        style={{
          minWidth: 0,
          flex: 1,
          height: "100%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <EventHeader
          event={event}
          phases={phases}
          activePhase={activePhase}
          onPhaseChange={onPhaseChange}
          picker={picker}
        />
        <main style={{ padding: 22, flex: 1, minHeight: 0, overflowY: "auto" }}>
          {children}
        </main>
      </div>
  );
}


/* ---------- header and phase rail ---------- */

function EventHeader({
  event,
  phases,
  activePhase,
  onPhaseChange,
  picker,
}: {
  event: EventContext;
  phases: Phase[];
  activePhase: PhaseId;
  onPhaseChange: (id: PhaseId) => void;
  picker?: React.ReactNode;
}) {
  return (
    <header
      style={{
        padding: "15px 22px 0",
        borderBottom: `1px solid ${C.line}`,
        position: "sticky",
        top: 0,
        background: C.paper,
        zIndex: 10,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          paddingBottom: 13,
        }}
      >
        <div>
          <div style={label}>{event.kicker}</div>
          <h1
            style={{
              fontFamily: DISPLAY,
              fontSize: 32,
              fontWeight: 700,
              lineHeight: 1,
              margin: "3px 0 0",
            }}
          >
            {event.venue}
          </h1>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {picker}
          {event.live !== false && (
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                padding: "6px 12px",
                background: C.greenLt,
                borderRadius: 6,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 6,
                  background: C.green,
                }}
              />
              <span style={{ ...label, color: C.greenDk }}>Live mode</span>
            </span>
          )}
        </div>
      </div>

      <div style={{ display: "flex", gap: 2, overflowX: "auto" }}>
        {phases.map((phase) => (
          <PhaseTab
            key={phase.id}
            phase={phase}
            active={activePhase === phase.id}
            onSelect={() => onPhaseChange(phase.id)}
          />
        ))}
      </div>
    </header>
  );
}

function PhaseTab({
  phase,
  active,
  onSelect,
}: {
  phase: Phase;
  active: boolean;
  onSelect: () => void;
}) {
  const { count } = phase;
  const allIn = count ? count.done === count.total : false;
  const none = count ? count.done === 0 : false;

  return (
    <button
      onClick={onSelect}
      aria-current={active ? "page" : undefined}
      style={{
        padding: "8px 15px 10px",
        cursor: "pointer",
        background: "transparent",
        border: "none",
        borderBottom: active ? `2px solid ${C.green}` : "2px solid transparent",
        textAlign: "left",
        whiteSpace: "nowrap",
        fontFamily: UI,
      }}
    >
      <div style={{ ...label, color: active ? C.green : C.warmLt }}>
        {phase.number}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 1 }}>
        <span
          style={{
            fontSize: 13,
            fontWeight: active ? 600 : 400,
            color: active ? C.ink : C.warm,
          }}
        >
          {phase.label}
        </span>

        {count && (
          <span
            style={{
              fontFamily: MONO,
              fontSize: 10.5,
              padding: "2px 6px",
              borderRadius: 4,
              display: "flex",
              alignItems: "center",
              gap: 4,
              background: allIn ? C.greenLt : C.sand,
              color: allIn ? C.greenDk : none ? C.warmLt : C.warm,
            }}
          >
            {!allIn && !none && (
              <span
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: 5,
                  background: C.mustard,
                }}
              />
            )}
            {count.done}/{count.total}
          </span>
        )}
      </div>
    </button>
  );
}
