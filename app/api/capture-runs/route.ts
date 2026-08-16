import { NextRequest, NextResponse } from 'next/server';

const BASE = 'https://wriggly-tutu-groin.ngrok-free.dev';
const HEADERS = { 'ngrok-skip-browser-warning': '1' };

async function upstream(path: string, init?: RequestInit) {
  return fetch(`${BASE}${path}`, { ...init, headers: { ...HEADERS, ...(init?.headers ?? {}) } });
}


// POST /api/questions?sailor=name -- Stores questions for Sailor
export async function POST(req: NextRequest){
  const {searchParams} = new URL(req.url);
  const path = `/create_run`
  const body = await req.json()

  const res = await upstream(path, {
	method: 'POST',
	headers: {'Content-Type': 'application/json'},
	body: JSON.stringify(body),
  });
  return NextResponse.json(res);
}
