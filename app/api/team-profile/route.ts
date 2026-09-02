import { NextResponse } from 'next/server';
import { readTeamDoc } from '@/lib/sailorStore';

/**
 * GET /api/team-profile
 *
 * The squad context file (team/current.md), or 404 when none has been
 * generated. The team-scope counterpart to /api/sailor-profile.
 */
export async function GET() {
  try {
    const content = await readTeamDoc('current.md');
    if (!content) {
      return NextResponse.json(
        { error: 'No team context file on file. Generate one from the console first.' },
        { status: 404 },
      );
    }
    return NextResponse.json({ content });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[team-profile]', msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
