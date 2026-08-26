import { NextRequest, NextResponse } from 'next/server';
import { regenerateFromTranscripts } from '@/lib/sailorReport';
import { saveSailorReport } from '@/lib/sailorStore';

/**
 * POST /api/sailor-report/regenerate  { sailor, role?, chars? }
 *
 * Rebuilds a sailor's document from the tail of their transcribed speech and
 * writes it to Firestore under `sailor/{name}`, keeping the previous version.
 *
 * Testing tool for now — attribution of uploads is matched on the free-text
 * title, so results are only as good as the naming convention.
 */
export async function POST(req: NextRequest) {
  try {
    const { sailor, role, chars } = await req.json();
    if (!sailor?.trim()) {
      return NextResponse.json({ error: 'sailor is required' }, { status: 400 });
    }

    const report = await regenerateFromTranscripts(sailor.trim(), role ?? '', chars ?? 2000);
    const saved = await saveSailorReport(report);

    return NextResponse.json({
      ...saved,
      scanned: report.scanned,
      content: report.content,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[sailor-report/regenerate]', msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
