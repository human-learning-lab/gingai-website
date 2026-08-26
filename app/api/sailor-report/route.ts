import { NextRequest, NextResponse } from 'next/server';
import { generateSailorReport } from '@/lib/sailorReport';
import { saveDailyReport } from '@/lib/sailorStore';

/**
 * POST /api/sailor-report  { runId, sailor, role }
 *
 * Pulls the sailor's questionnaire answers for a run, runs the `report` agent
 * and stores the result as daily.md in Firebase Storage, keeping every prior
 * generation alongside it.
 */
export async function POST(req: NextRequest) {
  try {
    const { runId, sailor, role } = await req.json();
    if (!runId || !sailor) {
      return NextResponse.json({ error: 'runId and sailor are required' }, { status: 400 });
    }

    const report = await generateSailorReport(runId, sailor, role ?? '');
    const saved = await saveDailyReport(report);

    return NextResponse.json({ ...saved, sources: report.sources, content: report.content });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[sailor-report]', msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
