import { NextRequest, NextResponse } from 'next/server';

const BASE    = 'https://wriggly-tutu-groin.ngrok-free.dev';
const HEADERS = { 'ngrok-skip-browser-warning': '1' };

// POST /api/sim-session — upload a sim session file (multipart)
// Body: FormData with 'file' (the simulator export), optional 'user', 'session_date'
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get('file');
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: 'Missing sim session file' }, { status: 400 });
    }

    const upstream = new FormData();
    upstream.append('file', file);
    const user = form.get('user');
    const date = form.get('session_date');
    if (user) upstream.append('user', user.toString());
    if (date) upstream.append('session_date', date.toString());

    const res = await fetch(`${BASE}/sim_session`, {
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
