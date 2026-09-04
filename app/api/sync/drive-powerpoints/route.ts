import { NextRequest, NextResponse } from 'next/server';
import { syncPowerpointFolders } from '@/lib/powerpointSync';

// Uses googleapis + firebase-admin, neither of which run on the Edge runtime.
export const runtime = 'nodejs';

const ROOT_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;
const SYNC_SHARED_SECRET = process.env.SYNC_SHARED_SECRET;

/**
 * POST /api/sync/drive-powerpoints
 *
 * Copies every race's "NN-Powerpoint" folder contents from Drive into
 * Firestore/Storage — see src/lib/powerpointSync.ts. Meant to be hit on a
 * schedule (external cron or Vercel Cron), not by a signed-in user, hence
 * the shared-secret header rather than Clerk — a scheduler has no session.
 */
export async function POST(req: NextRequest) {
  if (!SYNC_SHARED_SECRET || req.headers.get('x-sync-secret') !== SYNC_SHARED_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!ROOT_FOLDER_ID) {
    return NextResponse.json({ error: 'GOOGLE_DRIVE_FOLDER_ID not configured' }, { status: 500 });
  }

  try {
    const result = await syncPowerpointFolders(ROOT_FOLDER_ID);
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[sync/drive-powerpoints] error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
