import { NextRequest, NextResponse } from 'next/server';
import { readBriefing, readTranscript, saveBriefing, saveTranscript } from '@/lib/briefingStore';

export const runtime = 'nodejs';

/**
 * GET /api/sessions/{runId}/briefing
 *
 * The saved briefing for this run: the structured record from Firestore and the
 * transcript from Storage. 404 when the run has no briefing yet, which is what
 * puts the screen back on the upload prompt.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ runId: string }> },
) {
  try {
    const { runId } = await params;
    const record = await readBriefing(runId);
    if (!record) {
      return NextResponse.json({ error: 'No briefing saved for this run' }, { status: 404 });
    }

    const transcript = await readTranscript(runId);
    return NextResponse.json({ ...record, transcript: transcript ?? '' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[sessions/briefing:GET]', msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}

/**
 * POST /api/sessions/{runId}/briefing
 *
 * Files the briefing: the transcript in Storage, the structured record beside
 * the rest of the race day in Firestore. The screen has called this since it
 * was written; it just never existed.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ runId: string }> },
) {
  try {
    const { runId } = await params;
    const { structured, prompt, transcript, recordingId, filename } = await req.json();

    /* The transcript first: the Firestore record points at it, and a pointer to
       something that is not there is worse than no pointer. */
    let transcriptPath: string | null = null;
    if (typeof transcript === 'string' && transcript.trim()) {
      transcriptPath = await saveTranscript(runId, transcript);
    }

    const saved = await saveBriefing(runId, {
      goals: structured?.goals ?? [],
      decisions: structured?.decisions ?? [],
      sections: structured?.sections ?? [],
      prompt,
      recordingId,
      filename,
      transcriptPath: transcriptPath ?? undefined,
    });

    return NextResponse.json({ ...saved, transcriptPath });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[sessions/briefing:POST]', msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
