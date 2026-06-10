import { NextRequest, NextResponse } from 'next/server';

const BASE = 'https://wriggly-tutu-groin.ngrok-free.dev';
const HEADERS = { 'ngrok-skip-browser-warning': '1' };

async function upstream(path: string, init?: RequestInit) {
  return fetch(`${BASE}${path}`, { ...init, headers: { ...HEADERS, ...(init?.headers ?? {}) } });
}


// POST /api/transcripts?type=race|capture|debrief|media Upload a transcription
export async function POST(req: NextRequest){
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type');
  if (!type) return NextResponse.json({ error: 'Missing type' }, { status: 400 });

  const pathMap: Record<string, string> = {
    race:    `/upload_race/`,
    capture: `/upload_capture/`,
	offline_capture: `/upload_offline_capture/`,
    debrief: `/upload_debrief/`,
	media:  `/upload_media`,
  };
  const path = pathMap[type];
  if (!path) return NextResponse.json({ error: 'Unknown type' }, { status: 400 });

  const body = await req.json();
  delete body.test;
  const res = await upstream(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}


// GET /api/transcripts — fetch all data
export async function GET() {
  try {
    const [racesRes, debriefsRes, capturesRes, uploadsRes, eventsRes] = await Promise.all([
      upstream('/races', { cache: 'no-store' }),
      upstream('/debriefs/', { cache: 'no-store' }),
      upstream('/captures/', { cache: 'no-store' }),
      upstream('/uploads/', { cache: 'no-store' }),
      upstream('/events', { cache: 'no-store' }),
    ]);
    const [races, debriefs, captures, uploads, events] = await Promise.all([
      racesRes.json(), debriefsRes.json(), capturesRes.json(), uploadsRes.json(), eventsRes.json(),
    ]);
    return NextResponse.json({ races, debriefs, captures, uploads, events });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}

// PATCH /api/transcripts?type=race|capture|debrief|media&id=N — update
export async function PATCH(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type');
  const id   = searchParams.get('id');
  if (!type || !id) return NextResponse.json({ error: 'Missing type or id' }, { status: 400 });

  const pathMap: Record<string, string> = {
    race:    `/races/${id}`,
    capture: `/captures/${id}`,
    debrief: `/debriefs/${id}`,
	media:   `/uploads/${id}`,
  };
  const path = pathMap[type];
  if (!path) return NextResponse.json({ error: 'Unknown type' }, { status: 400 });

  const body = await req.json();
  const res = await upstream(path, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

// DELETE /api/transcripts?type=race|capture|debrief|media&id=N — delete
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type');
  const id   = searchParams.get('id');
  if (!type || !id) return NextResponse.json({ error: 'Missing type or id' }, { status: 400 });

  const pathMap: Record<string, string> = {
    race:    `/races/${id}`,
    capture: `/captures/${id}`,
    debrief: `/debriefs/${id}`,
	media:	 `/uploads/${id}`,
  };
  const path = pathMap[type];
  if (!path) return NextResponse.json({ error: 'Unknown type' }, { status: 400 });

  const res = await upstream(path, { method: 'DELETE' });
  return new NextResponse(null, { status: res.status });
}
