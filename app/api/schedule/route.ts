import { NextRequest, NextResponse } from 'next/server';

const BASE = process.env.VIKTOR_API_URL ?? 'https://wriggly-tutu-groin.ngrok-free.dev';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const regatta = searchParams.get('regatta');
  const day = searchParams.get('day');
  if (!regatta || day === null) return NextResponse.json({ error: 'Missing regatta or day' }, { status: 400 });

  try {
    const res = await fetch(`${BASE}/schedule/${regatta}/${day}`, {
      headers: { 'ngrok-skip-browser-warning': '1' },
    });
    if (!res.ok) return NextResponse.json(null, { status: 404 });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(null, { status: 404 });
  }
}

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const regatta = searchParams.get('regatta');
  const day = searchParams.get('day');
  if (!regatta || day === null) return NextResponse.json({ error: 'Missing regatta or day' }, { status: 400 });

  try {
    const body = await req.json();
    const res = await fetch(`${BASE}/schedule/${regatta}/${day}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': '1' },
      body: JSON.stringify(body),
    });
    if (!res.ok) return NextResponse.json({ error: `Upstream ${res.status}` }, { status: res.status });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Upstream unavailable' }, { status: 503 });
  }
}
