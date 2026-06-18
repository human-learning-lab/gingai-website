import { NextRequest, NextResponse } from 'next/server';

const BASE = process.env.VIKTOR_API_URL ?? 'https://wriggly-tutu-groin.ngrok-free.dev';
const HEADERS = { 'ngrok-skip-browser-warning': '1' };

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const regatta = searchParams.get('regatta');
  const day = searchParams.get('day');
  if (!regatta || day === null) return NextResponse.json({ error: 'Missing params' }, { status: 400 });

  try {
    const res = await fetch(`${BASE}/schedule/${regatta}/${day}`, { headers: HEADERS });
    if (!res.ok) return NextResponse.json(null, { status: 404 });
    const data = await res.json();
    // Viktor returns { events: ScheduleEvent[] } — unwrap to plain array
    const events = Array.isArray(data) ? data : (data?.events ?? null);
    if (!events) return NextResponse.json(null, { status: 404 });
    return NextResponse.json(events);
  } catch {
    return NextResponse.json(null, { status: 404 });
  }
}

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const regatta = searchParams.get('regatta');
  const day = searchParams.get('day');
  if (!regatta || day === null) return NextResponse.json({ error: 'Missing params' }, { status: 400 });

  try {
    const events = await req.json();
    // Viktor expects { events: ScheduleEvent[] } — wrap array
    const body = Array.isArray(events) ? { events } : events;
    const res = await fetch(`${BASE}/schedule/${regatta}/${day}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...HEADERS },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: err }, { status: res.status });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Upstream unavailable' }, { status: 503 });
  }
}
