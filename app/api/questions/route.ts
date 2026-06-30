import { NextRequest, NextResponse } from 'next/server';

const BASE = 'https://wriggly-tutu-groin.ngrok-free.dev';
const HEADERS = { 'ngrok-skip-browser-warning': '1' };

async function upstream(path: string, init?: RequestInit) {
  return fetch(`${BASE}${path}`, { ...init, headers: { ...HEADERS, ...(init?.headers ?? {}) } });
}


// POST /api/questions?sailor=name -- Stores questions for Sailor
export async function POST(req: NextRequest){
 const {params} = new URL(req.url);
 const sailor = params.get('sailor');
 const path = `/questions/${sailor}`

 const res = await upstream(path);
 return new NextResponse.json(res);

}


// GET /api/questions?sailor=name — fetch questions for Sailor
export async function GET(req: NextRequest) {
 const {params} = new URL(req.url);
 const sailor = params.get('sailor');
 const path = `/questions/${sailor}`

 const res = await upstream(path);
 return new NextResponse.json(res);
}
