import { NextRequest, NextResponse } from 'next/server';

const AGENT_BASE = process.env.AGENT_API_URL ?? 'https://ginga-742926686826.us-east1.run.app';

async function proxy(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const upstream = `${AGENT_BASE}/${path.join('/')}`;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  let body: BodyInit | undefined;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    body = await req.text();
  }

  const res = await fetch(upstream, {
    method: req.method,
    headers,
    body,
  });

  const contentType = res.headers.get('content-type') ?? '';

  // SSE — stream through
  if (contentType.includes('text/event-stream')) {
    return new NextResponse(res.body, {
      status: res.status,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'X-Accel-Buffering': 'no',
      },
    });
  }

  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { 'Content-Type': contentType || 'application/json' },
  });
}

export const GET    = proxy;
export const POST   = proxy;
export const DELETE = proxy;
export const PATCH  = proxy;
