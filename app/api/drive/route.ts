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

export async function GET() {
  try {
    const auth = getAuth();
    const drive = google.drive({ version: 'v3', auth });

    const res = await drive.files.list({
      q: `'${FOLDER_ID}' in parents and trashed = false`,
      fields: 'files(id,name,mimeType,size,modifiedTime,webViewLink,iconLink,parents)',
      orderBy: 'modifiedTime desc',
      pageSize: 200,
    });

    return NextResponse.json(res.data.files ?? []);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[drive] error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
