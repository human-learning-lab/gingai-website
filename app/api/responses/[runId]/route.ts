import { NextRequest, NextResponse } from 'next/server';

const BASE = 'https://wriggly-tutu-groin.ngrok-free.dev';
const HEADERS = { 'ngrok-skip-browser-warning': '1' };

async function upstream(path: string, init?: RequestInit) {
  return fetch(`${BASE}${path}`, { ...init, headers: { ...HEADERS, ...(init?.headers ?? {}) } });
}


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId } = await params;
  const kind = request.nextUrl.searchParams.get('kind');
  const sailor = request.nextUrl.searchParams.get('sailor'); 


  if (!kind) {
    return NextResponse.json(
      { error: 'Missing required query param: kind' },
      { status: 400 }
    );
  }
  const path = sailor ? `/responses/${runId}/${kind}/${sailor}` : `/responses/${runId}/${kind}`

  try {
    const res= await upstream(path);
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching from upstream:', error);
    return NextResponse.json(
      { error: 'Failed to fetch from upstream service' },
      { status: 502 }
    );
  }
}


export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId } = await params;
  const kind = request.nextUrl.searchParams.get('kind');
  const sailor = request.nextUrl.searchParams.get('sailor'); 


  if (!kind) {
    return NextResponse.json(
      { error: 'Missing required query param: kind' },
      { status: 400 }
    );
  }
  const path = sailor ? `/responses/${runId}/${kind}/${sailor}` : `/responses/${runId}/${kind}`

  try {
    const res= await upstream(path,{
	  method: 'POST',
	  headers: {'Content-Type': 'application/json'},
	  body: JSON.stringify(request.json),
  	});
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching from upstream:', error);
    return NextResponse.json(
      { error: 'Failed to fetch from upstream service' },
      { status: 502 }
    );
  }
}
