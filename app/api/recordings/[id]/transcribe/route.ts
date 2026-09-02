import { NextRequest, NextResponse } from 'next/server';
import { readRecording } from '@/lib/briefingApi';

export const runtime = 'nodejs';

/**
 * POST /api/recordings/{id}/transcribe
 *
 * Returns the transcript for an uploaded recording. The transcription itself
 * happens during upload — /upload_media writes the text into the uploads row —
 * so this reads the result rather than starting the work. The screen's separate
 * transcribing stage is kept: it is still the point the coach is waiting on.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const recording = await readRecording(id);

    if (!recording) {
      return NextResponse.json({ error: `No recording ${id}` }, { status: 404 });
    }
    if (!recording.transcript.trim()) {
      return NextResponse.json(
        { error: 'The recording uploaded but came back with no transcript.' },
        { status: 502 },
      );
    }

    return NextResponse.json(recording);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[recordings/transcribe]', msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
