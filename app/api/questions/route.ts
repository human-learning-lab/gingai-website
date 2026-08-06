import { NextRequest, NextResponse } from 'next/server';

/*
 * Handle Questions set with own route, or many calls to Questions?
 */

const BASE = 'https://wriggly-tutu-groin.ngrok-free.dev';
const HEADERS = { 'ngrok-skip-browser-warning': '1' };

async function upstream(path: string, init?: RequestInit) {
  return fetch(`${BASE}${path}`, { ...init, headers: { ...HEADERS, ...(init?.headers ?? {}) } });
}


// POST /api/questions?sailor=name -- Stores questions for Sailor
export async function POST(req: NextRequest){
 const {searchParams} = new URL(req.url);
 const sailor = searchParams.get('sailor');
 const path = `/questions/${sailor}`

 const res = await upstream(path);
 return NextResponse.json(res);

}


// GET /api/questions?sailor=name — fetch questions for Sailor
export async function GET(req: NextRequest) {
 const {searchParams} = new URL(req.url);
 const sailor = searchParams.get('sailor');
 const path = `/questions/${sailor}`

 const res = await upstream(path);
 const questions = await res.json();
 return NextResponse.json(questions);
}

// PATCH /api/questions?id=int1
export async function PATCH(req: NextRequest){
 const {searchParams} = new URL(req.url);
 const question_id = searchParams.get('id');
 const path = '/questions/${id}'

 const res = await upstream(path);
 return NextResponse.json(res);
}
// DELETE /api/questions?id=int1
export async funtion DELETE(req: NextRequest){
 const {searchParams} = new URL(req.url);
 const question_id = searchParams.get('id');
 const path = '/questions/${id}'

 const res = await upstream(path);
 return NextResponse.json(res);
}
