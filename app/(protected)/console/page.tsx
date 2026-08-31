"use client";

import { useState } from "react";
import ConsoleShell, { type Phase, type PhaseId } from "@/screens/Console";
import SkeletonBriefPage from "@/screens/SkeletonBrief";
import PrimingInPage from "@/screens/PrimingIn";
import BriefingPage from "@/screens/Briefing";
import CapturePage from "@/screens/Capturing";
import CapturesInPage from "@/screens/CapturesIn";
import HotDebriefPage from "@/screens/HotDebrief";
import RegenerateSailorDoc from "@/screens/Console/RegenerateSailorDoc";
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

/** "Rio de Janeiro" + day 2 → "RiodeJaneiroRaceday2Season6", the shape parseRunId reads. */
function buildRunId(city: string, dayNumber: number) {
  return `${city.replace(/\s+/g, "")}Raceday${dayNumber}Season${SEASON}`;
}

const select: React.CSSProperties = {
  fontSize: 12.5,
  fontWeight: 600,
  padding: "7px 10px",
  borderRadius: 6,
  border: "1px solid #DDD5C4",
  background: "#FFFDF8",
  color: "#1A1A18",
  cursor: "pointer",
};

export default function ConsolePage() {
  const [phase, setPhase] = useState<PhaseId>("skeleton");
  const [regatId, setRegatId] = useState<string>(getDefaultRegat());
  const [dayIndex, setDayIndex] = useState<number>(() => getDefaultDay(getDefaultRegat()));

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
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <select
        style={select}
        value={regatId}
        aria-label="Regatta"
        onChange={(e) => { setRegatId(e.target.value); setDayIndex(0); }}
      >
        {REGATTAS.map((r) => (
          <option key={r.id} value={r.id}>
            {r.short} · {r.dates}
          </option>
        ))}
      </select>
      <select
        style={select}
        value={Math.min(dayIndex, regat.days.length - 1)}
        aria-label="Race day"
        onChange={(e) => setDayIndex(Number(e.target.value))}
      >
        {regat.days.map((label, i) => (
          <option key={i} value={i}>{label}</option>
        ))}
      </select>
    </div>
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
      {/* TEMPORARY — delete this mount and the component before merging to
          main. Renders only when NEXT_PUBLIC_TEAM=hll. */}
      <RegenerateSailorDoc />
      <GenerateTeamDoc />

      {phase === "skeleton" && <SkeletonBriefPage runId={runId} />}
      {phase === "priming" && (
        <PrimingInPage runId={runId} onCarried={() => setPhase("briefing")} />
      )}
      {phase === "briefing" && <BriefingPage runId={runId} />}
      {phase === "capture" && <CapturePage runId={runId} />}
      {phase === "captures" && <CapturesInPage runId={runId} />}
      {phase === "debrief" && <HotDebriefPage runId={runId} />}
    </ConsoleShell>
  );
}
