import { NextResponse } from 'next/server';

const BASE = 'https://wriggly-tutu-groin.ngrok-free.dev';
const HEADERS = { 'ngrok-skip-browser-warning': '1' };

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { headers: HEADERS, cache: 'no-store' });
  if (!res.ok) throw new Error(`Upstream ${path} returned ${res.status}`);
  return res.json();
}

export async function GET() {
  try {
    const [races, debriefs, captures, events] = await Promise.all([
      get('/races'),
      get('/debriefs/'),
      get('/captures/'),
      get('/events'),
    ]);

    return NextResponse.json({ races, debriefs, captures, events });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
