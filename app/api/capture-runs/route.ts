import { NextRequest, NextResponse } from 'next/server';
import { mirrorQuestionSet } from '@/lib/questionStore';

const BASE = process.env.VIKTOR_API_URL ?? 'https://wriggly-tutu-groin.ngrok-free.dev';
const HEADERS = { 'ngrok-skip-browser-warning': '1' };

async function upstream(path: string, init?: RequestInit) {
  return fetch(`${BASE}${path}`, { ...init, headers: { ...HEADERS, ...(init?.headers ?? {}) } });
}

interface QuestionSet { questions?: string[] }
interface RunValue {
  teamQuestions?: string[];
  personal?: Record<string, QuestionSet>;
}

/** What this recipient should end up with, given the scope. */
function expectedFor(value: RunValue, scope: string, recipient: string): string[] {
  if (scope === 'personal') {
    return value.personal?.[recipient]?.questions ?? value.teamQuestions ?? [];
  }
  return value.teamQuestions ?? [];
}

/** Read back what the backend actually stored for one recipient. */
async function storedFor(runId: string, kind: string, recipient: string): Promise<string[] | null> {
  const res = await upstream(
    `/responses/${encodeURIComponent(runId)}/${encodeURIComponent(kind)}/${encodeURIComponent(recipient)}`,
    { cache: 'no-store' },
  );
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  // An absent sailor comes back as 200 {detail: "..."} rather than a 404.
  return Array.isArray(data?.questions) ? data.questions : null;
}

/**
 * POST /api/capture-runs — freeze a question set and create the run.
 *
 * Two problems this guards against, both of which delivered stale questions
 * while reporting success:
 *
 * 1. The upstream status was discarded. Returning NextResponse.json(res) on the
 *    raw Response serialised the object itself, giving {} with status 200
 *    however the backend answered, so `if (!res.ok)` in the send handler could
 *    never fire.
 *
 * 2. /create_run is insert-only. Sending again for a sailor who already has a
 *    row for this run leaves the old questions in place and still answers 200
 *    with a null body — verified against the live backend. The recipient then
 *    opens their link and gets the previous set.
 *
 * So the stored set is read back and compared. A no-op write is reported as a
 * conflict rather than passing as success. The real fix is upstream: either
 * /create_run upserts, or /responses/{run}/{kind}/{sailor} gains PUT or DELETE.
 *
 * The set is also mirrored into Firestore under races/{race}/days/{day}. That
 * write always replaces, so the mirror holds what was intended even on a send
 * the backend refuses — which is the case worth having a record of.
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { runId, kind, scope, recipients, value } = body as {
    runId: string; kind: string; scope: string; recipients: string[]; value: RunValue;
  };

  try {
    const res = await upstream('/create_run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const text = await res.text();
    if (!res.ok) {
      console.error('[capture-runs] upstream error:', res.status, text.slice(0, 400));
      return NextResponse.json(
        { error: `Upstream ${res.status}: ${text.slice(0, 200)}` },
        { status: res.status },
      );
    }

    /* Mirror first and independently of the upstream result: a refused resend
       is exactly when having the intended set on record is useful. A mirror
       failure must not fail the send, so it is reported, not thrown. */
    let mirror: Awaited<ReturnType<typeof mirrorQuestionSet>> | null = null;
    let mirrorError: string | null = null;
    try {
      mirror = await mirrorQuestionSet({
        runId, kind, scope, recipients: recipients ?? [],
        teamQuestions: value.teamQuestions,
        teamPrompt: (value as { teamPrompt?: string }).teamPrompt,
        personal: value.personal,
      });
    } catch (err) {
      mirrorError = err instanceof Error ? err.message : 'mirror failed';
      console.error('[capture-runs] firestore mirror:', mirrorError);
    }

    // Confirm the write landed, per recipient.
    const stale: string[] = [];
    await Promise.all(
      (recipients ?? []).map(async (name) => {
        const want = expectedFor(value, scope, name);
        if (!want.length) return;
        const got = await storedFor(runId, kind, name);
        if (!got || JSON.stringify(got) !== JSON.stringify(want)) stale.push(name);
      }),
    );

    if (stale.length) {
      const who = stale.join(', ');
      console.error('[capture-runs] write did not take for:', who);
      return NextResponse.json(
        {
          error:
            `The backend kept the previous questions for ${who}. /create_run only ` +
            `inserts — it will not replace a set that already exists for this run, ` +
            `so they would have received the old ones. Nothing was sent.`,
          stale,
          mirror,
          mirrorError,
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { upstream: text ? JSON.parse(text) : {}, mirror, mirrorError },
      { status: res.status },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[capture-runs]', msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
