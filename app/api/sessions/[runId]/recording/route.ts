import { NextRequest, NextResponse } from 'next/server';
import { uploadRecording } from '@/lib/briefingApi';

/* Audio is large; give the upload room and keep it off the edge runtime. */
export const runtime = 'nodejs';
export const maxDuration = 300;

/**
 * POST /api/sessions/{runId}/recording   multipart, field "audio"
 *
 * Sends the recording to Viktor's /upload_media as multipart, which transcribes
 * it, and returns the id the rest of the chain uses. The screen has called this
 * route since it was written; it just never existed.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ runId: string }> },
) {
  try {
    const { runId } = await params;
    const form = await req.formData();
    const file = form.get('audio');

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    const filename = file.name || 'recording';
    const filetype = filename.split('.').pop()?.toLowerCase() || 'wav';

    /* Passed straight through as a file rather than buffered into base64:
       /upload_media wants multipart, and a briefing recording is large enough
       that the 33% base64 inflation was worth avoiding anyway. */
    const { recordingId, title } = await uploadRecording({
      runId,
      file,
      filename,
      filetype,
      user: (form.get('user') as string | null) ?? 'briefing',
    });

    return NextResponse.json({ recordingId, title });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[sessions/recording]', msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
