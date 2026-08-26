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

/* ============================================================
   The console. One shell, six phases.

   Each page component owns only its own content — the sidebar,
   event header and phase rail live here, so navigation and the
   response counts have a single home.
   ============================================================ */

const venue = 'Sassnitz';
const kicker = "Race day 2 Season 6";
const day = kicker.replace(/ /g,'')

const runId = venue + day;
console.log(runId);

export default function ConsolePage() {
  const [phase, setPhase] = useState<PhaseId>("skeleton");

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

  return (
    <ConsoleShell
      event={{
        venue: "Sassnitz",
        kicker: kicker,
        live: true,
      }}
      user={{ name: "Rich Mason" }}
      phases={phases}
      activePhase={phase}
      onPhaseChange={setPhase}
    >
      <RegenerateSailorDoc />

      {phase === "skeleton" && <SkeletonBriefPage runId={runId} />}
      {phase === "priming" && <PrimingInPage runId={runId} />}
      {phase === "briefing" && <BriefingPage runId={runId} />}
      {phase === "capture" && <CapturePage runId={runId} />}
      {phase === "captures" && <CapturesInPage runId={runId} />}
      {phase === "debrief" && <HotDebriefPage runId={runId} />}
    </ConsoleShell>
  );
}

