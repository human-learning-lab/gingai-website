import { NextRequest, NextResponse } from 'next/server';
import { mirrorRunTranscripts, type AnswerRow } from '@/lib/answerTranscripts';

export const runtime = 'nodejs';

const VIKTOR = process.env.VIKTOR_API_URL ?? 'https://wriggly-tutu-groin.ngrok-free.dev';
const HEADERS = { 'ngrok-skip-browser-warning': '1' };

/**
 * POST /api/responses/{runId}/mirror?kind=priming
 *
 * Copies the day's answers into Storage as one markdown document per sailor.
 * Called by the console as it loads, so the mirror follows the source rather
 * than needing a trigger of its own.
 *
 * Reads from the API rather than trusting a posted body: the console has
 * already substituted the filed question set over what the API returned, and
 * the mirror should record what the sailor was actually asked and answered.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ runId: string }> },
) {
  const { runId } = await params;
  const kind = req.nextUrl.searchParams.get('kind');
  if (!kind) {
    return NextResponse.json({ error: 'Missing required query param: kind' }, { status: 400 });
  }

  try {
    const res = await fetch(
      `${VIKTOR}/responses/${encodeURIComponent(runId)}/${encodeURIComponent(kind)}`,
      { headers: HEADERS, cache: 'no-store' },
    );
    if (!res.ok) {
      return NextResponse.json({ error: `Upstream ${res.status}` }, { status: 502 });
    }

    const rows = await res.json().catch(() => null);
    if (!Array.isArray(rows)) return NextResponse.json({ mirrored: [], failed: [] });

    const result = await mirrorRunTranscripts(runId, kind, rows as AnswerRow[]);
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[responses/mirror]', msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
