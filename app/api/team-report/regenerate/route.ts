import { NextResponse } from 'next/server';
import { generateTeamContext } from '@/lib/sailorReport';
import { listSailors, readSailorDoc, readTeamDoc, saveTeamDoc } from '@/lib/sailorStore';
import { isHuleLabMember } from '@/data/crew';

/**
 * TEMPORARY — DELETE BEFORE MERGING TO MAIN.
 *
 * TODO(alpha): remove this route together with
 * src/screens/Console/GenerateTeamDoc.tsx. It regenerates the squad context
 * file on demand for anyone who can reach it, and costs one model call over
 * every sailor file at once.
 *
 * POST /api/team-report/regenerate
 *
 * Reads every sailor's context file and writes the squad-level one to
 * team/current.md, revising whatever is already there.
 */
export async function POST() {
  try {
    /* HuleLab people are staff. Their context file is a line naming what they
       do, not a sailor profile, and folding it in would have the squad picture
       reasoning about a CEO's foiling technique. */
    const sailors = (await listSailors()).filter(s => !isHuleLabMember(s));
    if (!sailors.length) {
      return NextResponse.json(
        { error: 'No sailor context files found. Generate at least one first.' },
        { status: 404 },
      );
    }

    const files = (
      await Promise.all(
        sailors.map(async (sailor) => {
          const content = await readSailorDoc(sailor, 'current.md');
          return content ? { sailor, content } : null;
        }),
      )
    ).filter((f): f is { sailor: string; content: string } => f !== null);

    if (!files.length) {
      return NextResponse.json({ error: 'Sailor files could not be read' }, { status: 502 });
    }

    // The squad file revises what is already stored, so read it before writing.
    const previous = await readTeamDoc('current.md');
    const team = await generateTeamContext(files, previous);
    const saved = await saveTeamDoc('current.md', team.content, team.generatedAt);

    return NextResponse.json({
      ...saved,
      sailors: team.sailors,
      revised: team.revised,
      content: team.content,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[team-report/regenerate]', msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
