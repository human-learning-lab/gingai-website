import { NextRequest, NextResponse } from 'next/server';
import { readSailorDoc } from '@/lib/sailorStore';

/**
 * GET /api/sailor-profile?sailor=Martine
 *
 * Returns the sailor's standing profile (sailors/{name}/current.md), or 404
 * when they have none. Thin wrapper over readSailorDoc so the browser does not
 * need Storage credentials or a bucket path.
 */
export async function GET(req: NextRequest) {
  const sailor = req.nextUrl.searchParams.get('sailor')?.trim();
  if (!sailor) {
    return NextResponse.json({ error: 'sailor is required' }, { status: 400 });
  }

  try {
    const content = await readSailorDoc(sailor, 'current.md');
    if (!content) {
      return NextResponse.json(
        { error: `No profile on file for ${sailor}. Generate one from the console first.` },
        { status: 404 },
      );
    }
    return NextResponse.json({ sailor, content });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[sailor-profile]', msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
