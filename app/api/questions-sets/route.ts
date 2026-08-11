import { NextRequest, NextResponse } from 'next/server';

const BASE = 'https://wriggly-tutu-groin.ngrok-free.dev';
const HEADERS = { 'ngrok-skip-browser-warning': '1' };

async function upstream(path: string, init?: RequestInit) {
  return fetch(`${BASE}${path}`, { ...init, headers: { ...HEADERS, ...(init?.headers ?? {}) } });
}


export async function POST(req: NextRequest){
	const path = '/question_sets';
	console.log('TODO');
}
	 
export async function GET(req: NextRequest) {
	console.log('TODO');
}
