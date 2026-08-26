import { NextRequest, NextResponse } from 'next/server';
import { generateSailorReport } from '@/lib/sailorReport';
import { saveSailorReport } from '@/lib/sailorStore';

/**
 * POST /api/sailor-report  { runId, sailor, role }
 *
 * Pulls the sailor's answers from Viktor's API, runs the `report` agent — which
 * has existed since "More Agents" but was never called from anywhere — and
 * stores the document in Firestore under `sailor/{name}`, keeping every prior
 * generation in the `versions` subcollection.
 */
export async function POST(req: NextRequest) {
  try {
    const { runId, sailor, role } = await req.json();
    if (!runId || !sailor) {
      return NextResponse.json({ error: 'runId and sailor are required' }, { status: 400 });
    }

    const report = await generateSailorReport(runId, sailor, role ?? '');
    const saved = await saveSailorReport(report);

    return NextResponse.json({ ...saved, sources: report.sources, content: report.content });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[sailor-report]', msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
