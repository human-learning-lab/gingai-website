import { NextRequest, NextResponse } from 'next/server';
import { readCaptureArtifacts, saveCaptureArtifacts } from '@/lib/questionStore';

/**
 * POST /api/capture-artifacts  { runId, teamReading?, distilled? }
 *
 * Files what phase 05 produces against its race day — the twin of
 * /api/priming-artifacts. Each part is optional and every write merges, so
 * re-distilling does not clear the reading, and neither touches what the
 * morning filed.
 */
export async function POST(req: NextRequest) {
  try {
    const { runId, teamReading, distilled } = await req.json();
    if (!runId) {
      return NextResponse.json({ error: 'runId is required' }, { status: 400 });
    }
    if (teamReading === undefined && distilled === undefined) {
      return NextResponse.json({ error: 'Nothing to save' }, { status: 400 });
    }

    const saved = await saveCaptureArtifacts({ runId, teamReading, distilled });
    return NextResponse.json(saved);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[capture-artifacts]', msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}

/**
 * GET /api/capture-artifacts?runId=...
 *
 * What phase 05 filed for this run, for the debrief to carry in. 404 when the
 * run has nothing on file.
 */
export async function GET(req: NextRequest) {
  const runId = req.nextUrl.searchParams.get('runId')?.trim();
  if (!runId) {
    return NextResponse.json({ error: 'runId is required' }, { status: 400 });
  }

  try {
    const artifacts = await readCaptureArtifacts(runId);
    if (!artifacts) {
      return NextResponse.json({ error: 'Nothing filed for this run yet' }, { status: 404 });
    }
    return NextResponse.json(artifacts);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[capture-artifacts:GET]', msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
