import { NextRequest, NextResponse } from 'next/server';
import { regenerateProfile } from '@/lib/sailorReport';
import { saveSailorDoc, readSailorDoc } from '@/lib/sailorStore';

/**
 * POST /api/sailor-report/regenerate  { sailor, role?, chars? }
 *
 * Rebuilds a sailor's standing profile — description, strengths, weaknesses,
 * goals — from the tail of their transcribed speech, revising whatever is
 * already stored, and writes it to sailors/{name}/current.md.
 *
 * The end-of-day report is a separate document and is not produced here; see
 * POST /api/sailor-report for that.
 *
 * Testing tool for now: attribution of uploads is matched on the free-text
 * title, so results are only as good as the naming convention.
 */
export async function POST(req: NextRequest) {
  try {
    const { sailor, role, chars } = await req.json();
    if (!sailor?.trim()) {
      return NextResponse.json({ error: 'sailor is required' }, { status: 400 });
    }
    const name = sailor.trim();

    // The profile revises what is already stored, so read it before writing.
    const previous = await readSailorDoc(name, 'current.md');
    // chars omitted or 0 means the whole corpus.
    const profile = await regenerateProfile(name, role ?? '', previous, chars ?? 0);
    const saved = await saveSailorDoc(name, 'current.md', profile.content, profile.generatedAt);

    return NextResponse.json({
      ...saved,
      scanned: profile.scanned,
      revised: profile.revised,
      content: profile.content,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[sailor-report/regenerate]', msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
