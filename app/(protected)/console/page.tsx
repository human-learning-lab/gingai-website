"use client";

import { useEffect, useRef, useState } from "react";
import ConsoleShell, { type Phase, type PhaseId } from "@/screens/Console";
import SkeletonBriefPage from "@/screens/SkeletonBrief";
import PrimingInPage from "@/screens/PrimingIn";
import BriefingPage from "@/screens/Briefing";
import CapturePage from "@/screens/Capturing";
import CapturesInPage from "@/screens/CapturesIn";
import HotDebriefPage from "@/screens/HotDebrief";
import GenerateTeamDoc from "@/screens/Console/GenerateTeamDoc";
import { REGATTAS, getRegatResult, getDefaultRegat, getDefaultDay } from "@/data/regattas";

/* ============================================================
   The console. One shell, six phases.

   Each page component owns only its own content — the sidebar,
   event header and phase rail live here, so navigation and the
   response counts have a single home.

   The regatta and day come from the shared Season 6 calendar —
   the same list the backbone renders — instead of a hardcoded
   venue. Everything a race day files is keyed by the runId built
   here, so switching regatta or day switches the whole console
   to that day's record.
   ============================================================ */

const SEASON = "6";

/* Which day the coach was last on. Without this the console resets to the
   calendar default on every visit — the active regatta, or the next upcoming
   one if none is running — so a coach reviewing a finished regatta is thrown
   back to a day with nothing filed and it reads as though nothing loaded. */
const LAST_DAY_KEY = "ginga.console.lastDay";

interface LastDay { regatId: string; dayIndex: number }

function readLastDay(): LastDay | null {
  /* Wrapped: storage throws outright in some privacy modes, and this is a
     convenience, not something worth breaking the console over. */
  try {
    const raw = window.localStorage.getItem(LAST_DAY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LastDay>;
    if (typeof parsed?.regatId !== "string" || typeof parsed?.dayIndex !== "number") return null;

    // A regatta that has since been renamed or removed should not pin the console.
    const regat = REGATTAS.find((r) => r.id === parsed.regatId);
    if (!regat) return null;
    return {
      regatId: regat.id,
      dayIndex: Math.max(0, Math.min(parsed.dayIndex, regat.days.length - 1)),
    };
  } catch {
    return null;
  }
}

function writeLastDay(value: LastDay) {
  try {
    window.localStorage.setItem(LAST_DAY_KEY, JSON.stringify(value));
  } catch {
    /* Nothing to do — the console works without it. */
  }
}

/** "Rio de Janeiro" + day 2 → "RiodeJaneiroRaceday2Season6", the shape parseRunId reads. */
function buildRunId(city: string, dayNumber: number) {
  return `${city.replace(/\s+/g, "")}Raceday${dayNumber}Season${SEASON}`;
}

/* Console header tokens, matching ConsoleShell's palette. */
const T = {
  sand: "#EDE7DA",
  line: "#DDD5C4",
  green: "#00A651",
  ink: "#1A1A18",
  warm: "#6B6459",
  warmLt: "#8E877A",
  field: "#FFFDF8",
} as const;
/* Same face as the backbone's strip — Barlow Condensed is loaded globally. */
const STRIP_FONT = "'Barlow Condensed', sans-serif";

/* The season carousel, matching the backbone's regatta strip: beige band,
   Barlow Condensed, the active venue raised on a light card with a green
   underline. Day pills on the right. */
function RegattaStrip({
  regatId,
  dayIndex,
  onRegatChange,
  onDayChange,
}: {
  regatId: string;
  dayIndex: number;
  onRegatChange: (id: string) => void;
  onDayChange: (i: number) => void;
}) {
  const stripRef = useRef<HTMLDivElement>(null);
  const regat = REGATTAS.find((r) => r.id === regatId) ?? REGATTAS[0];

  /* Keep the active venue centred, as the backbone does. */
  useEffect(() => {
    const strip = stripRef.current;
    const active = strip?.querySelector<HTMLElement>('[data-active="true"]');
    if (!strip || !active) return;
    const stripRect = strip.getBoundingClientRect();
    const btnRect = active.getBoundingClientRect();
    strip.scrollTo({
      left: strip.scrollLeft + btnRect.left - stripRect.left - stripRect.width / 2 + btnRect.width / 2,
      behavior: "smooth",
    });
  }, [regatId]);

  const result = getRegatResult(regat.start, regat.end);

  return (
    /* Full-bleed beige band: cancels the header's own padding so the strip
       runs edge to edge, the way the backbone's does. */
    <div
      style={{
        margin: "-15px -22px 13px",
        background: T.sand,
        borderBottom: `1px solid ${T.line}`,
      }}
    >
      <div
        style={{
          padding: "8px 22px 0",
          fontFamily: STRIP_FONT,
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: T.warmLt,
        }}
      >
        SailGP 2026 — Season 6
        {result === "Active" && (
          <span style={{ marginLeft: 10, color: T.green }}>● Live</span>
        )}
        {result === "Upcoming" && (
          <span style={{ marginLeft: 10, color: "#B8912F" }}>Next up</span>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "flex-end", gap: 14 }}>
        <div
          ref={stripRef}
          style={{
            display: "flex",
            gap: 2,
            overflowX: "auto",
            flex: 1,
            padding: "6px 16px 0",
            scrollbarWidth: "none",
          }}
        >
          {REGATTAS.map((r) => {
            const active = r.id === regatId;
            const past = getRegatResult(r.start, r.end) === "Past";
            return (
              <button
                key={r.id}
                data-active={active}
                title={r.warning ?? undefined}
                onClick={() => { onRegatChange(r.id); onDayChange(0); }}
                style={{
                  appearance: "none",
                  flexShrink: 0,
                  padding: "6px 12px 8px",
                  borderRadius: "6px 6px 0 0",
                  border: "none",
                  borderBottom: `2px solid ${active ? T.green : "transparent"}`,
                  background: active ? T.field : "transparent",
                  cursor: "pointer",
                  textAlign: "left",
                  opacity: past && !active ? 0.55 : 1,
                }}
              >
                <div
                  style={{
                    fontFamily: STRIP_FONT,
                    fontSize: 13,
                    fontWeight: 700,
                    letterSpacing: "0.04em",
                    color: active ? T.ink : T.warm,
                    whiteSpace: "nowrap",
                  }}
                >
                  {r.short}
                </div>
                <div
                  style={{
                    fontFamily: STRIP_FONT,
                    fontSize: 10.5,
                    fontWeight: 600,
                    letterSpacing: "0.06em",
                    color: active ? T.green : T.warmLt,
                    marginTop: 1,
                    whiteSpace: "nowrap",
                  }}
                >
                  {r.dates}
                </div>
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: 4, padding: "0 22px 8px 0", flexShrink: 0 }}>
          {regat.days.map((label, i) => {
            const active = Math.min(dayIndex, regat.days.length - 1) === i;
            return (
              <button
                key={i}
                onClick={() => onDayChange(i)}
                style={{
                  fontFamily: STRIP_FONT,
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                  padding: "5px 11px",
                  borderRadius: 6,
                  border: `1px solid ${active ? T.green : T.line}`,
                  background: active ? T.green : T.field,
                  color: active ? "#fff" : T.ink,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function ConsolePage() {
  const [phase, setPhase] = useState<PhaseId>("skeleton");
  const [regatId, setRegatId] = useState<string>(getDefaultRegat());
  const [dayIndex, setDayIndex] = useState<number>(() => getDefaultDay(getDefaultRegat()));

  /* Restored after mount rather than in the initial state: localStorage does
     not exist while this renders on the server, and reading it there would
     mismatch the hydrated markup. */
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    const last = readLastDay();
    if (last) {
      setRegatId(last.regatId);
      setDayIndex(last.dayIndex);
    }
    setRestored(true);
  }, []);

  /* Held until the restore has run. Writing on mount would save the calendar
     default over the stored selection before it had been read — and because
     React invokes effects twice in development, the second pass then read back
     the default it had just written, so the selection never survived. */
  useEffect(() => {
    if (!restored) return;
    writeLastDay({ regatId, dayIndex });
  }, [restored, regatId, dayIndex]);

  const regat = REGATTAS.find((r) => r.id === regatId) ?? REGATTAS[0];
  const dayNumber = Math.min(dayIndex, regat.days.length - 1) + 1;
  const runId = buildRunId(regat.city, dayNumber);

  /* Counts come from the API. Only the phases that collect
     answers carry one; the rest render without a badge. */
  const phases: Phase[] = [
    { id: "skeleton", number: "01", label: "Skeleton brief" },
    { id: "priming", number: "02", label: "Priming in"},
    { id: "briefing", number: "03", label: "Briefing" },
    { id: "capture", number: "04", label: "Capture" },
    { id: "captures", number: "05", label: "Captures in" },
    { id: "debrief", number: "06", label: "Hot debrief" },
  ];

  const picker = (
    <RegattaStrip
      regatId={regatId}
      dayIndex={dayIndex}
      onRegatChange={setRegatId}
      onDayChange={setDayIndex}
    />
  );

  return (
    <ConsoleShell
      /* The key remounts every phase on a different race day, so nothing
         fetched for the previous runId lingers on screen. */
      key={runId}
      event={{
        venue: regat.city,
        kicker: `Race day ${dayNumber} Season ${SEASON}`,
        live: getRegatResult(regat.start, regat.end) === "Active",
      }}
      user={{ name: "Rich Mason" }}
      phases={phases}
      activePhase={phase}
      onPhaseChange={setPhase}
      picker={picker}
    >
      {/* TEMPORARY — a hand-crank on the squad context pipeline, kept until
          it has a proper home. The per-sailor equivalent used to sit beside it
          and is unmounted: /interview-console builds a sailor's file from
          their interview, which is the path we want people using. */}
      <GenerateTeamDoc />

      {/* A venue that is reachable but should be left alone until its day.
          Unlike the TEST venues this is not alpha-gated — the warning matters
          most in production, where Valencia is the next real race day and the
          one most easily opened by mistake. */}
      {regat.warning && (
        <div
          role="status"
          style={{
            margin: "0 0 16px",
            padding: "11px 14px",
            borderRadius: 7,
            border: "1px solid #E3CE94",
            background: "#FDF6E6",
            color: "#7A5E14",
            fontFamily: STRIP_FONT,
            fontSize: 12.5,
            fontWeight: 600,
            lineHeight: 1.5,
          }}
        >
          {regat.warning}
        </div>
      )}

      {phase === "skeleton" && <SkeletonBriefPage runId={runId} />}
      {phase === "priming" && (
        <PrimingInPage runId={runId} onCarried={() => setPhase("briefing")} />
      )}
      {phase === "briefing" && <BriefingPage runId={runId} />}
      {phase === "capture" && <CapturePage runId={runId} />}
      {phase === "captures" && (
        <CapturesInPage runId={runId} onCarried={() => setPhase("debrief")} />
      )}
      {phase === "debrief" && <HotDebriefPage runId={runId} />}
    </ConsoleShell>
  );
}
