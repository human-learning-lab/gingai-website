import { NextRequest, NextResponse } from 'next/server';

const BASE = 'https://wriggly-tutu-groin.ngrok-free.dev';
const HEADERS = { 'ngrok-skip-browser-warning': '1' };

async function upstream(path: string, init?: RequestInit) {
  return fetch(`${BASE}${path}`, { ...init, headers: { ...HEADERS, ...(init?.headers ?? {}) } });
}


// POST /api/questions/sailor -- Stores questions for Sailor
export async function POST(req: NextRequest){
}


// GET /api/questions?sailor=name — fetch questions for Sailor
export async function GET(req: NextRequest) {
 const params = new URL(req.url);
 const sailor = params.get('sailor');
 const path = `questions/${sailor}`

 const res = await = upstream(path);
 return new NextResponse.json(res);
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
