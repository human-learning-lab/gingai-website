import { NextRequest, NextResponse } from 'next/server';
import { profileFromInterview } from '@/lib/sailorReport';
import { readSailorDoc, saveSailorDoc } from '@/lib/sailorStore';
import { INTERVIEW_KIND, INTERVIEW_RUN_ID } from '@/data/interview';

export const runtime = 'nodejs';
/** One model call over eleven answers. */
export const maxDuration = 300;

const VIKTOR = process.env.VIKTOR_API_URL ?? 'https://wriggly-tutu-groin.ngrok-free.dev';
const HEADERS = { 'ngrok-skip-browser-warning': '1' };

interface ResponseRow {
  recipient?: string;
  questions?: string[];
  responses?: string[];
}

/**
 * What the sailor said, as question-and-answer pairs, with the distilled line
 * beside the answer it came from.
 *
 * Both are sent on purpose. The distilled line says what the answer was about;
 * the raw answer carries the phrasing, the numbers and the hedges, which is the
 * material the profile is actually built out of.
 */
function interviewMaterial(row: ResponseRow, distilled?: string[]): string {
  const questions = row.questions ?? [];
  const answers = row.responses ?? [];

  return questions
    .map((question, i) => ({ question, answer: (answers[i] ?? '').trim(), line: (distilled?.[i] ?? '').trim() }))
    .filter(x => x.answer)
    .map(x => [
      `Q${questions.indexOf(x.question) + 1}: ${x.question}`,
      x.line ? `In short: ${x.line}` : null,
      `In their words: ${x.answer}`,
    ].filter(Boolean).join('\n'))
    .join('\n\n');
}

/**
 * POST /api/interview/profile   { sailor, distilled?, runId? }
 *
 * Rebuilds one sailor's context file from their interview answers and nothing
 * else, and replaces team/sailors/{sailor}/current.md with the result.
 *
 * Deliberately narrower than the other generator, which scans every transcript
 * on file. The interview is a deliberate pass over the whole structure, one
 * question per section; letting months of race-day chatter in alongside it
 * would dilute the answers that were gathered to be authoritative.
 */
export async function POST(req: NextRequest) {
  try {
    const { sailor, role, distilled, runId } = await req.json() as {
      sailor?: string; role?: string; distilled?: string[]; runId?: string;
    };
    if (!sailor?.trim()) {
      return NextResponse.json({ error: 'No sailor named' }, { status: 400 });
    }

    const run = runId?.trim() || INTERVIEW_RUN_ID;
    const res = await fetch(
      `${VIKTOR}/responses/${encodeURIComponent(run)}/${INTERVIEW_KIND}/${encodeURIComponent(sailor)}`,
      { headers: HEADERS, cache: 'no-store' },
    );
    if (!res.ok) {
      /* Upstream answers 404 for a sailor with no row, which is not a fault —
         it is the ordinary state before they have answered. */
      const missing = res.status === 404;
      return NextResponse.json(
        { error: missing ? `${sailor} has not answered the interview yet.` : `Could not read the answers (${res.status})` },
        { status: missing ? 404 : 502 },
      );
    }

    const data = await res.json().catch(() => null);
    const row: ResponseRow | null = Array.isArray(data) ? data[0] ?? null : data;
    const material = row ? interviewMaterial(row, distilled) : '';
    if (!material) {
      return NextResponse.json(
        { error: `${sailor} has not answered the interview yet.` },
        { status: 404 },
      );
    }

    /* Read the current file so the model revises rather than starts over: the
       stable layer should survive an interview that only moved the living one. */
    const previous = await readSailorDoc(sailor, 'current.md');
    const profile = await profileFromInterview(sailor, role ?? '', material, previous);
    const saved = await saveSailorDoc(sailor, 'current.md', profile.content, profile.generatedAt);

    return NextResponse.json({
      ...saved,
      sailor,
      revised: profile.revised,
      content: profile.content,
      answersUsed: material.split('\n\n').length,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[interview/profile]', msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
