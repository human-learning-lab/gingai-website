import { NextRequest, NextResponse } from 'next/server';

const BASE    = 'https://wriggly-tutu-groin.ngrok-free.dev';
const HEADERS = { 'ngrok-skip-browser-warning': '1' };

// POST /api/offline-upload — receives a recorded audio file from the client
// and forwards it to the FastAPI /upload_capture endpoint.
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get('file');

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: 'Missing audio file' }, { status: 400 });
    }

    const upstream = new FormData();
    upstream.append('file', file);

    const user  = form.get('user');
    const title = form.get('title');
    if (user)  upstream.append('user',  user.toString());
    if (title) upstream.append('title', title.toString());

    const res = await fetch(`${BASE}/upload_capture`, {
      method:  'POST',
      headers: HEADERS,
      body:    upstream,
    });

    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
