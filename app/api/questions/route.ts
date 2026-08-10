import { NextRequest, NextResponse } from 'next/server';

const BASE = 'https://wriggly-tutu-groin.ngrok-free.dev';
const HEADERS = { 'ngrok-skip-browser-warning': '1' };

async function upstream(path: string, init?: RequestInit) {
  return fetch(`${BASE}${path}`, { ...init, headers: { ...HEADERS, ...(init?.headers ?? {}) } });
}


// POST /api/questions?sailor=name -- Stores questions for Sailor
export async function POST(req: NextRequest){
  const {searchParams} = new URL(req.url);
  const sailor = searchParams.get('sailor');
  const path = `/questions`
  const body = await req.json()

  const res = await upstream(path, {
	method: 'POST',
	headers: {'Content-Type': 'application/json'},
	body: JSON.stringify(body),
  });
  return NextResponse.json(res);

}


// GET /api/questions -> All questions sets
// GET /api/questions?id -> QuestionSet by id
export async function GET(req: NextRequest) {
  const {searchParams} = new URL(req.url);
  const path = `/questions`

  const res = await upstream(path);
  const questions = await res.json();
  return NextResponse.json(questions);
}

// PATCH /api/questions?id=int1
export async function PATCH(req: NextRequest){
  const {searchParams} = new URL(req.url);
  const question_id = searchParams.get('id');
  const path = `/questions/${question_id}`
  const body = await req.json();
  const res = await upstream(path, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
// DELETE /api/questions?id=int1
export async function DELETE(req: NextRequest){
  const {searchParams} = new URL(req.url);
  const question_id = searchParams.get('id');
  const path = `/questions/${question_id}`
  const res = await upstream(path, { method: 'DELETE' });
  return new NextResponse(null, { status: res.status });
}
