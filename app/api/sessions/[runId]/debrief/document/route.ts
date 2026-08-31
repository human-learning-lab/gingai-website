import { NextRequest, NextResponse } from 'next/server';
import { saveDebriefDocument } from '@/lib/questionStore';

/**
 * PATCH /api/sessions/{runId}/debrief/document   { text }
 *
 * The coach's edits to the debrief document. Only `edited` moves — the
 * generated text keeps its version so the two can be compared.
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

    const saved = await saveDebriefDocument(runId, text);
    return NextResponse.json(saved);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[sessions/debrief/document]', msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
