import { NextRequest, NextResponse } from 'next/server';
import { saveDebriefMarkdown } from '@/lib/briefingStore';
import { generateTeamContext, regenerateProfile } from '@/lib/sailorReport';
import { listSailors, readSailorDoc, readTeamDoc, saveSailorDoc, saveTeamDoc } from '@/lib/sailorStore';

export const runtime = 'nodejs';
/* One model call per sailor plus one for the squad. Ten sailors runs to a
   couple of minutes. */
export const maxDuration = 300;

const VIKTOR = process.env.VIKTOR_API_URL ?? 'https://wriggly-tutu-groin.ngrok-free.dev';
const HEADERS = { 'ngrok-skip-browser-warning': '1' };

interface ResponseRow {
  recipient?: string;
  questions?: string[];
  responses?: string[];
}

/** What one sailor said in today's capture, as question-and-answer pairs. */
function captureMaterial(row: ResponseRow): string {
  const questions = row.questions ?? [];
  const answers = row.responses ?? [];
  return questions
    .map((q, i) => ({ q, a: (answers[i] ?? '').trim() }))
    .filter(x => x.a)
    .map(x => `Q: ${x.q}\nA: ${x.a}`)
    .join('\n\n');
}

/**
 * POST /api/sessions/{runId}/debrief/publish   { text }
 *
 * Closes the day out. Three writes, in the order their dependencies run:
 *
 *   1. the debrief document to races/{race}/{day}/debrief.md
 *   2. each sailor's context file, revised against what they said in capture
 *   3. the squad context file, revised against the debrief and the sailor files
 *
 * The squad file goes last on purpose: it is read across the individual files,
 * so it should see the versions this run just wrote rather than yesterday's.
 *
 * A sailor whose profile fails does not stop the others or the squad file — the
 * failure is named in the response instead. Losing the whole publish because one
 * sailor's material was thin would be the worse outcome.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ runId: string }> },
) {
  try {
    const { runId } = await params;
    const { text } = await req.json();

    if (typeof text !== 'string' || !text.trim()) {
      return NextResponse.json({ error: 'The debrief document is empty' }, { status: 400 });
    }

    // 1. The document itself. If this fails there is nothing to publish.
    const document = await saveDebriefMarkdown(runId, text);

    // 2. Each sailor who actually said something today.
    const res = await fetch(
      `${VIKTOR}/responses/${encodeURIComponent(runId)}/capture`,
      { headers: HEADERS, cache: 'no-store' },
    );
    const rows = res.ok ? await res.json().catch(() => null) : null;
    const captures: ResponseRow[] = Array.isArray(rows) ? rows : [];

    const updated: string[] = [];
    const failed: { sailor: string; error: string }[] = [];

    await Promise.all(captures.map(async (row) => {
      const sailor = row.recipient?.trim();
      if (!sailor) return;
      const material = captureMaterial(row);
      if (!material) return;

      try {
        const previous = await readSailorDoc(sailor, 'current.md');
        const profile = await regenerateProfile(sailor, '', previous, 0, material);
        await saveSailorDoc(sailor, 'current.md', profile.content, profile.generatedAt);
        updated.push(sailor);
      } catch (err) {
        failed.push({ sailor, error: err instanceof Error ? err.message : 'failed' });
      }
    }));

    // 3. The squad file, over the versions just written.
    let team: { path: string; url?: string } | null = null;
    let teamError: string | null = null;
    try {
      const names = await listSailors();
      const files = (await Promise.all(names.map(async (sailor) => {
        const content = await readSailorDoc(sailor, 'current.md');
        return content ? { sailor, content } : null;
      }))).filter((f): f is { sailor: string; content: string } => f !== null);

      if (files.length) {
        const previous = await readTeamDoc('current.md');
        const context = await generateTeamContext(files, previous, text);
        team = await saveTeamDoc('current.md', context.content, context.generatedAt);
      } else {
        teamError = 'No sailor context files to read';
      }
    } catch (err) {
      teamError = err instanceof Error ? err.message : 'failed';
    }

    return NextResponse.json({
      document,
      sailors: updated.sort(),
      sailorsFailed: failed,
      team,
      teamError,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[debrief/publish]', msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
