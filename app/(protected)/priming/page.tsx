"use client";

import { useState } from "react";
import PrimingIn, {
  type PrimingResponse,
  type Prompts,
  type Sailor,
  type SquadGoal,
  type TeamPicture,
} from "@/screens/PrimingIn";

/* ============================================================
   Example wiring. Replace local state with your own fetch/save
   and the three handlers with real API calls.
   ============================================================ */

const SAILORS: Sailor[] = [
  { id: "mar", name: "Martine", role: "Strategist" },
  { id: "pau", name: "Paul", role: "Helm" },
  { id: "pie", name: "Pietro", role: "Speed" },
  { id: "ras", name: "Rasmus", role: "Flight controller" },
  { id: "mrc", name: "Marco", role: "Trim" },
  { id: "bre", name: "Breno", role: "Trim" },
  { id: "ric", name: "Rich", role: "Strategy & performance" },
  { id: "nic", name: "Nico", role: "Data analyst" },
];

const QUESTIONS = [
  "What should be the team's area of focus tomorrow?",
  "What are your uncertainties?",
  "What are your personal goals for the day?",
];

const DEFAULT_PROMPTS: Prompts = {
  distil: `Condense each answer to one line.

Rules:
- Keep the sailor's own words and emphasis. Do not translate into
  coaching language.
- Keep any number, threshold or specific moment they mentioned.
- If they raised two things, keep both. Do not pick for them.
- Never add a conclusion they didn't reach.`,

  synthesis: `Read every sailor's priming answers and produce the picture the coach
takes into the briefing.

Return:
1. Convergence — what several sailors independently raised. Give a count.
2. Divergence — where they see it differently. Do not resolve it; flag it
   for the room.
3. Individual goals by role, in each sailor's own words.
4. Uncertainties worth answering in the briefing.

Rules:
- Never speak for sailors who haven't answered. State the coverage.
- Use their language, not yours.
- One line per point. This is read under time pressure.`,

  squadGoals: `From the convergence above, propose 2–3 squad goals for the day.

Each goal must be:
- Specific enough to know if it happened
- Owned by the whole crew, not one role
- Measurable against something we can see in the data or the video
- Written in the crew's own language

Return the goal and, for each, the evidence that would settle whether we hit it.`,
};

export default function PrimingInPage({
  runId,
}: {
  runId: string;
}) {
  const [responses, setResponses] = useState<PrimingResponse[]>([]);
  const [prompts, setPrompts] = useState<Prompts>(DEFAULT_PROMPTS);
  const [teamPicture, setTeamPicture] = useState<TeamPicture | null>(null);
  const [squadGoals, setSquadGoals] = useState<SquadGoal[]>([]);

  /* Re-condense every response. Server route keeps the model key off the client. */
  async function handleDistil(prompt: string) {
    const res = await fetch(`/api/priming/${runId}/distil`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
    if (!res.ok) throw new Error("Could not distil the answers");

    const { distilled } = (await res.json()) as {
      distilled: Record<string, string[]>;
    };

    setResponses((prev) =>
      prev.map((r) =>
        distilled[r.sailorId] ? { ...r, distilled: distilled[r.sailorId] } : r
      )
    );
    return distilled;
  }

  async function handleSynthesise(prompt: string) {
    const res = await fetch(`/api/priming/${runId}/synthesise`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
    if (!res.ok) throw new Error("Could not build the team picture");

    const picture = (await res.json()) as TeamPicture;
    setTeamPicture(picture);
    return picture;
  }

  async function handleProposeGoals(prompt: string) {
    const res = await fetch(`/api/priming/${runId}/squad-goals`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, teamPicture }),
    });
    if (!res.ok) throw new Error("Could not propose goals");

    const { goals } = (await res.json()) as { goals: SquadGoal[] };
    return goals;
  }

  /* Hand the picture and goals to the briefing, then navigate. */
  async function handleCarryForward() {
    await fetch(`/api/priming/${runId}/carry-forward`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamPicture, squadGoals }),
    });
    // router.push(`/briefing/${runId}`)
  }

  return (
    <div style={{ background: "#F7F4ED", minHeight: "100vh", padding: 22 }}>
      <PrimingIn
        sailors={SAILORS}
        questions={QUESTIONS}
        responses={responses}
        prompts={prompts}
        onPromptsChange={setPrompts}
        teamPicture={teamPicture}
        squadGoals={squadGoals}
        onDistil={handleDistil}
        onSynthesise={handleSynthesise}
        onProposeGoals={handleProposeGoals}
        onGoalsChange={setSquadGoals}
        onCarryForward={handleCarryForward}
      />
    </div>
  );
}
