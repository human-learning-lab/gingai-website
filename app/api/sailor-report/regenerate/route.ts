import { NextRequest, NextResponse } from 'next/server';
import { regenerateFromTranscripts, regenerateProfile } from '@/lib/sailorReport';
import { saveDailyReport, saveSailorDoc, readSailorDoc } from '@/lib/sailorStore';

/**
 * POST /api/sailor-report/regenerate  { sailor, role?, chars? }
 *
 * Rebuilds both of a sailor's documents from the tail of their transcribed
 * speech and writes them to Firebase Storage:
 *
 *   daily.md    the end-of-day report, one session
 *   current.md  the standing profile — description, strengths, weaknesses,
 *               goals — revised against whatever is already there
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
    const limit = chars ?? 2000;

    // The profile revises what is already stored, so read it before writing.
    const previous = await readSailorDoc(name, 'current.md');

    const [report, profile] = await Promise.all([
      regenerateFromTranscripts(name, role ?? '', limit),
      regenerateProfile(name, role ?? '', previous, limit),
    ]);

    const [daily, current] = await Promise.all([
      saveDailyReport(report),
      saveSailorDoc(name, 'current.md', profile.content, profile.generatedAt),
    ]);

    return NextResponse.json({
      scanned: profile.scanned,
      revised: profile.revised,
      daily: { ...daily, content: report.content },
      current: { ...current, content: profile.content },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[sailor-report/regenerate]', msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
