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


/* ── Standing context and the day's record ────────────────────
 * What the capture questions are written against. The morning phases file
 * these; the evening ones read them. Every fetch fails soft: a missing piece
 * means the questions are written without it, never that the screen breaks.
 */

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return (await res.json().catch(() => null)) as T | null;
  } catch {
    return null;
  }
}

/** The squad context file — team/current.md in Storage. */
export async function fetchTeamContext(): Promise<string | null> {
  const data = await getJson<{ content?: string }>('/api/team-profile');
  return data?.content ?? null;
}

/** One sailor's context file — team/sailors/{name}/current.md in Storage. */
export async function fetchSailorContext(sailor: string): Promise<string | null> {
  const data = await getJson<{ content?: string }>(
    `/api/sailor-profile?sailor=${encodeURIComponent(sailor)}`,
  );
  return data?.content ?? null;
}

export interface BriefingContext {
  goals: string[];
  decisions: string[];
  sections: { heading: string; body?: string; items?: string[]; tone?: string }[];
}

/** What the briefing settled — the record the evening is answering against. */
export async function fetchBriefing(runId: string): Promise<BriefingContext | null> {
  const data = await getJson<{
    goals?: (GoalLike | string)[];
    decisions?: ({ text?: string; owner?: string } | string)[];
    sections?: BriefingContext['sections'];
  }>(`/api/sessions/${encodeURIComponent(runId)}/briefing`);
  if (!data) return null;

  return {
    goals: (data.goals ?? []).map(goalText).filter(Boolean),
    decisions: (data.decisions ?? [])
      .map(d => typeof d === 'string' ? d : [d?.text, d?.owner && `(${d.owner})`].filter(Boolean).join(' '))
      .filter(Boolean),
    sections: data.sections ?? [],
  };
}

/** The morning's team picture, as the synthesize agent left it. */
export async function fetchTeamPicture(runId: string): Promise<unknown | null> {
  const data = await getJson<{ teamPicture?: unknown }>(
    `/api/priming-artifacts?runId=${encodeURIComponent(runId)}`,
  );
  return data?.teamPicture ?? null;
}

export interface SailorDay {
  /** The priming questions this sailor was actually sent. */
  questions: string[];
  /** Their answers, condensed to a line each in phase 02. */
  distilled: string[];
}

/**
 * What the day holds for one sailor — the subcollection under the race day.
 * Assembled from the two routes that already read it rather than a third.
 */
export async function fetchSailorDay(runId: string, sailor: string): Promise<SailorDay> {
  const [day, priming] = await Promise.all([
    getJson<{ sailors?: Record<string, { questions?: string[] }> }>(
      `/api/day-questions?runId=${encodeURIComponent(runId)}`,
    ),
    getJson<{ distilled?: Record<string, string[]> }>(
      `/api/priming-artifacts?runId=${encodeURIComponent(runId)}`,
    ),
  ]);

  return {
    questions: day?.sailors?.[sailor]?.questions ?? [],
    distilled: priming?.distilled?.[sailor] ?? [],
  };
}
