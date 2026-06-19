import { NextResponse } from 'next/server';
import { google } from 'googleapis';

const ROOT_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID!;
const FOLDER_MIME = 'application/vnd.google-apps.folder';

function getAuth() {
  return new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  webViewLink?: string;
  regatta: string;   // top-level folder name e.g. "07-Halifax"
  category: string;  // second-level folder name e.g. "02-Debrief"
}

interface GFile { id: string; name: string; mimeType: string; size?: string | null; modifiedTime?: string | null; webViewLink?: string | null; }

async function listChildren(drive: ReturnType<typeof google.drive>, folderId: string): Promise<GFile[]> {
  const results: GFile[] = [];
  let pageToken: string | undefined;
  do {
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'nextPageToken, files(id,name,mimeType,size,modifiedTime,webViewLink)',
      orderBy: 'name',
      pageSize: 200,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      ...(pageToken ? { pageToken } : {}),
    });
    for (const f of res.data.files ?? []) {
      if (f.id && f.name && f.mimeType) results.push(f as GFile);
    }
    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);
  return results;
}

export async function GET() {
  try {
    const auth = getAuth();
    const drive = google.drive({ version: 'v3', auth });

    // Level 1: regatta folders (01-Perth, 02-Auckland, …)
    const regattaFolders = await listChildren(drive, ROOT_FOLDER_ID);
    const files: DriveFile[] = [];

    await Promise.all(
      regattaFolders.map(async (regatta) => {
        if (regatta.mimeType !== FOLDER_MIME) return;
        // Level 2: category folders (01-Brief, 02-Debrief, …)
        const categoryFolders = await listChildren(drive, regatta.id);
        await Promise.all(
          categoryFolders.map(async (cat) => {
            if (cat.mimeType === FOLDER_MIME) {
              // Level 3: actual files
              const items = await listChildren(drive, cat.id);
              for (const f of items) {
                if (f.mimeType !== FOLDER_MIME) {
                  files.push({ ...f, regatta: regatta.name, category: cat.name } as DriveFile);
                }
              }
            } else {
              // File directly inside regatta folder
              files.push({ ...cat, regatta: regatta.name, category: '' } as DriveFile);
            }
          })
        );
      })
    );

    // Sort: newest first within each regatta
    files.sort((a, b) => (b.modifiedTime ?? '').localeCompare(a.modifiedTime ?? ''));

    return NextResponse.json(files);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[drive] error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
