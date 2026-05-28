import { NextRequest, NextResponse } from 'next/server';

const BASE = 'https://wriggly-tutu-groin.ngrok-free.dev';
const HEADERS = { 'ngrok-skip-browser-warning': '1' };

// POST /api/library — receives multipart FormData, converts file to base64, forwards to upload_media
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get('file');
    const filetype   = (form.get('filetype')   as string | null) ?? 'unknown';
    const upload_type = (form.get('upload_type') as string | null) ?? 'general';

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');

    const res = await fetch(`${BASE}/upload_media`, {
      method: 'POST',
      headers: { ...HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ filetype, upload_type, data: base64 }),
    });

    const text = await res.text();
    if (!res.ok) {
      console.error('[/api/library] FastAPI error:', res.status, text.slice(0, 500));
      return NextResponse.json({ error: `Upstream error ${res.status}: ${text.slice(0, 200)}` }, { status: 502 });
    }
    const data = text ? JSON.parse(text) : {};
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[/api/library] Error:', msg, err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
