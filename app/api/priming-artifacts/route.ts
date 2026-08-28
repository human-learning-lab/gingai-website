import { NextRequest, NextResponse } from 'next/server';
import { savePrimingArtifacts } from '@/lib/questionStore';

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
