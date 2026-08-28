import { NextRequest, NextResponse } from 'next/server';
import { readQuestionSet, saveGeneratedQuestions } from '@/lib/questionStore';

/**
 * GET /api/question-set?runId=...&sailor=...
 *
 * The questions for this run, from the Firestore mirror. Returns 404 when the
 * run was never mirrored, so callers can fall back to Viktor's API for runs
 * that predate it.
 */
export async function GET(req: NextRequest) {
  const runId = req.nextUrl.searchParams.get('runId')?.trim();
  const sailor = req.nextUrl.searchParams.get('sailor')?.trim() || undefined;

  if (!runId) {
    return NextResponse.json({ error: 'runId is required' }, { status: 400 });
  }

  try {
    const set = await readQuestionSet(runId, sailor);
    if (!set) {
      return NextResponse.json({ error: 'No mirrored question set for this run' }, { status: 404 });
    }
    return NextResponse.json(set);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[question-set]', msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}

/**
 * POST /api/question-set  { runId, scope, sailor?, questions, prompt? }
 *
 * Files a generated set against its race day, before any send. Merges, so
 * regenerating one sailor leaves the rest of the day untouched and a coach
 * redoing the briefing overwrites only what they redid.
 */
export async function POST(req: NextRequest) {
  try {
    const { runId, scope, sailor, questions, prompt } = await req.json();
    if (!runId || !scope) {
      return NextResponse.json({ error: 'runId and scope are required' }, { status: 400 });
    }
    if (!Array.isArray(questions) || !questions.length) {
      return NextResponse.json({ error: 'questions must be a non-empty array' }, { status: 400 });
    }

    const saved = await saveGeneratedQuestions({ runId, scope, sailor, questions, prompt });
    return NextResponse.json(saved ?? {});
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[question-set:POST]', msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
