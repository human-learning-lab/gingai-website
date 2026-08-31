import { NextRequest, NextResponse } from 'next/server';
import { readDayQuestions } from '@/lib/questionStore';

/**
 * GET /api/day-questions?runId=...&kind=priming|capture
 *
 * The question sets filed for a race day: the team set, and each sailor who was
 * sent one. Only sent sets are here — the mirror runs on the send path, not on
 * generate — so this is what the sailors actually received.
 *
 * 404 when nothing has been sent for this run.
 */
export async function GET(req: NextRequest) {
  const runId = req.nextUrl.searchParams.get('runId')?.trim();
  const kind = req.nextUrl.searchParams.get('kind')?.trim() || 'priming';
  if (!runId) {
    return NextResponse.json({ error: 'runId is required' }, { status: 400 });
  }

  try {
    const day = await readDayQuestions(runId, kind);
    if (!day) {
      return NextResponse.json({ error: 'Nothing sent for this run yet' }, { status: 404 });
    }
    return NextResponse.json(day);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[day-questions]', msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
