import { NextRequest, NextResponse } from 'next/server';
import { readPrimingArtifacts, savePrimingArtifacts } from '@/lib/questionStore';

/**
 * POST /api/priming-artifacts  { runId, teamPicture?, squadGoals?, distilled? }
 *
 * Files what phase 02 produces against its race day. Each part is optional and
 * every write merges, so re-distilling without rebuilding the picture does not
 * clear the picture, and vice versa.
 */
export async function POST(req: NextRequest) {
  try {
    const { runId, teamPicture, squadGoals, distilled } = await req.json();
    if (!runId) {
      return NextResponse.json({ error: 'runId is required' }, { status: 400 });
    }
    if (teamPicture === undefined && squadGoals === undefined && distilled === undefined) {
      return NextResponse.json({ error: 'Nothing to save' }, { status: 400 });
    }

    const saved = await savePrimingArtifacts({ runId, teamPicture, squadGoals, distilled });
    return NextResponse.json(saved);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[priming-artifacts]', msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}

/**
 * GET /api/priming-artifacts?runId=...
 *
 * What phase 02 filed for this run, for phase 03 to carry in. 404 when the run
 * has nothing on file.
 */
export async function GET(req: NextRequest) {
  const runId = req.nextUrl.searchParams.get('runId')?.trim();
  if (!runId) {
    return NextResponse.json({ error: 'runId is required' }, { status: 400 });
  }

  try {
    const artifacts = await readPrimingArtifacts(runId);
    if (!artifacts) {
      return NextResponse.json({ error: 'Nothing filed for this run yet' }, { status: 404 });
    }
    return NextResponse.json(artifacts);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[priming-artifacts:GET]', msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
