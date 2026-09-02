import { NextRequest, NextResponse } from 'next/server';
import { saveDebriefMarkdown } from '@/lib/briefingStore';

/**
 * PATCH /api/sessions/{runId}/debrief/document   { text }
 *
 * The coach's edits to the debrief document, written to Storage at
 * races/{race}/{day}/debrief.md — the same object the publish step files, so
 * saving and publishing cannot leave two different documents behind.
 *
 * The document is long prose with no queryable structure, which is what a
 * bucket is for; Firestore keeps the generated version and its metadata beside
 * the rest of the race day.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ runId: string }> },
) {
  try {
    const { runId } = await params;
    const { text } = await req.json() as { text?: unknown };
    if (typeof text !== 'string') {
      return NextResponse.json({ error: 'text is required' }, { status: 400 });
    }

    if (!text.trim()) {
      return NextResponse.json({ error: 'The debrief document is empty' }, { status: 400 });
    }

    const saved = await saveDebriefMarkdown(runId, text);
    return NextResponse.json(saved);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[sessions/debrief/document]', msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
