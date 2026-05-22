import { NextRequest, NextResponse } from 'next/server';

// Viktor: wire this up to your Whisper / transcription backend.
// Expects: multipart/form-data with an `audio` field (webm/mp4/wav blob).
// Returns: { text: string }

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const audio = form.get('audio');

    if (!audio || typeof audio === 'string') {
      return NextResponse.json({ error: 'No audio file' }, { status: 400 });
    }

    // TODO: send `audio` blob to transcription service (e.g. OpenAI Whisper)
    // Example:
    // const openai = new OpenAI();
    // const transcription = await openai.audio.transcriptions.create({
    //   file: audio,
    //   model: 'whisper-1',
    // });
    // return NextResponse.json({ text: transcription.text });

    return NextResponse.json(
      { error: 'Transcription not yet configured — Viktor needs to wire up the backend.' },
      { status: 501 }
    );
  } catch (err) {
    console.error('Transcribe error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
