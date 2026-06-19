import { NextResponse } from 'next/server';
import { google } from 'googleapis';

const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID!;

function getAuth() {
  return new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });
}

const FOLDER_MIME = 'application/vnd.google-apps.folder';

async function listAllFiles(drive: ReturnType<typeof google.drive>, rootId: string) {
  const files: object[] = [];
  const queue = [rootId];

  while (queue.length > 0) {
    const batch = queue.splice(0, 10); // process up to 10 folders at a time
    await Promise.all(batch.map(async (folderId) => {
      let pageToken: string | undefined;
      do {
        const res = await drive.files.list({
          q: `'${folderId}' in parents and trashed = false`,
          fields: 'nextPageToken, files(id,name,mimeType,size,modifiedTime,webViewLink,parents)',
          orderBy: 'name',
          pageSize: 200,
          supportsAllDrives: true,
          includeItemsFromAllDrives: true,
          ...(pageToken ? { pageToken } : {}),
        });
        for (const f of res.data.files ?? []) {
          if (f.mimeType === FOLDER_MIME) {
            queue.push(f.id!);
          } else {
            files.push(f);
          }
        }
        pageToken = res.data.nextPageToken ?? undefined;
      } while (pageToken);
    }));
  }

  return files;
}

export async function GET() {
  try {
    const auth = getAuth();
    const drive = google.drive({ version: 'v3', auth });
    const files = await listAllFiles(drive, FOLDER_ID);
    return NextResponse.json(files);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[drive] error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
