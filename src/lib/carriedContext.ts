/**
 * What the morning phases filed, read back for the evening ones. Phases 04 and
 * 05 both need the squad goals and each sailor's own goal; this is the one
 * place that knows where those live, so the two screens cannot drift apart.
 *
 * Client-side: everything goes through the app's own API routes.
 */

/* The briefing files goals as {text, change}; priming carries {goal, evidence}
   or plain strings. Either way the screens want the goal as one line. */
interface GoalLike { text?: string; goal?: string }

function goalText(g: GoalLike | string): string {
  if (typeof g === 'string') return g;
  return g?.text ?? g?.goal ?? '';
}

/**
 * The squad goals for this run, one line each. The briefing's goals-as-agreed
 * are the real thing; a run whose briefing has not been saved yet falls back
 * to the goals carried in from priming, so the capture questions are never
 * written against nothing when a morning record exists.
 */
export async function fetchSquadGoals(runId: string): Promise<string[]> {
  try {
    const res = await fetch(`/api/sessions/${encodeURIComponent(runId)}/briefing`);
    if (res.ok) {
      const data = await res.json().catch(() => null);
      const goals = (data?.goals as (GoalLike | string)[] | undefined)
        ?.map(goalText).filter(Boolean);
      if (goals?.length) return goals;
    }
  } catch { /* fall through to priming */ }

  try {
    const res = await fetch(`/api/priming-artifacts?runId=${encodeURIComponent(runId)}`);
    if (!res.ok) return [];
    const data = await res.json().catch(() => null);
    const goals = data?.briefingGoals;
    if (!Array.isArray(goals)) return [];
    return goals.map(goalText).filter(Boolean);
  } catch {
    return [];
  }
}

interface ResponseRow {
  recipient?: string;
  questions?: string[];
  responses?: string[];
}

/**
 * Each sailor's own goal for the day, keyed by name — their answer to the
 * morning priming question that asks for it. Sailors who did not answer, or
 * runs with no priming, simply have no entry; the screens already render an
 * absent goal as nothing.
 */
export async function fetchOwnGoals(runId: string): Promise<Record<string, string>> {
  try {
    const res = await fetch(`/api/responses/${encodeURIComponent(runId)}?kind=priming`);
    if (!res.ok) return {};
    const rows = await res.json().catch(() => null);
    if (!Array.isArray(rows)) return {};

    const goals: Record<string, string> = {};
    for (const row of rows as ResponseRow[]) {
      if (!row?.recipient || !Array.isArray(row.questions)) continue;
      const i = row.questions.findIndex((q) => /personal goal|your goal/i.test(q ?? ''));
      const answer = i >= 0 ? row.responses?.[i]?.trim() : '';
      if (answer) goals[row.recipient] = answer;
    }
    return goals;
  } catch {
    return {};
  }
}
