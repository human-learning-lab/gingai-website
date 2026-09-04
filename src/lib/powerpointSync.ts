import { google, type drive_v3 } from 'googleapis';
import { unzipSync } from 'fflate';
import type { Readable } from 'stream';
import { FieldValue } from 'firebase-admin/firestore';
import { db, bucket } from './firebaseAdmin';

/**
 * Copies each race's Powerpoint folder from Drive into Firebase, so an AI
 * flow can read the analyst's deck straight from Firestore instead of
 * hitting Drive (and re-parsing a .pptx) on every request.
 *
 * The analyst drops the deck into a Drive folder named "NN-Powerpoint"
 * under that race's regatta folder — same root the Library screen
 * (app/api/drive/route.ts) already reads:
 *
 *   <GOOGLE_DRIVE_FOLDER_ID>/
 *     10-Valencia/
 *       11-Powerpoint/
 *         Brazil Debrief.pptx
 *         supporting-chart.png
 *
 * No back-catalogue assumption: a regatta with no Powerpoint folder is
 * just skipped. A future "11-<race>/11-Powerpoint" is picked up
 * automatically — nothing here is tied to a specific race number.
 *
 * Presentations (Google Slides or an uploaded .pptx/.ppt) get their text
 * extracted and written directly into a Firestore doc. Everything else in
 * the folder (images, PDFs, ...) goes to Firebase Storage instead, with a
 * Firestore doc pointing at it — Firestore's 1MB document cap and base64
 * overhead make it a poor fit for binary content.
 */

const FOLDER_MIME = 'application/vnd.google-apps.folder';
const GOOGLE_SLIDES_MIME = 'application/vnd.google-apps.presentation';
const PPTX_MIME = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
/* Legacy binary .ppt is deliberately NOT here: it isn't a zip, so the local
   text extraction below can't read it. It falls through to the plain-file
   branch (Storage upload) instead of failing the sync. */
const PRESENTATION_MIME_TYPES = new Set<string>([GOOGLE_SLIDES_MIME, PPTX_MIME]);

const POWERPOINT_FOLDER_RE = /^\d+[-_ ]*powerpoint$/i;

function isPowerpointFolder(name: string): boolean {
  const trimmed = name.trim();
  return POWERPOINT_FOLDER_RE.test(trimmed) || trimmed.toLowerCase() === 'powerpoint';
}

interface GFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string | null;
}

/* Read-only, same as app/api/drive/route.ts. Text extraction happens
   locally (unzip the .pptx), so no Drive write access is ever needed —
   the copy-to-Slides approach was tried first and fails because service
   accounts have no Drive storage quota of their own. */
function getSyncAuth() {
  return new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });
}

async function listChildren(drive: drive_v3.Drive, folderId: string): Promise<GFile[]> {
  const results: GFile[] = [];
  let pageToken: string | undefined;
  do {
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'nextPageToken, files(id,name,mimeType,modifiedTime)',
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

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

/** Decode the handful of XML entities that appear in slide text runs. */
function decodeXmlEntities(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, '&'); // last, so "&amp;lt;" doesn't double-decode
}

const MEDIA_CONTENT_TYPES: Record<string, string> = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif',
  webp: 'image/webp', bmp: 'image/bmp', svg: 'image/svg+xml', tiff: 'image/tiff',
  emf: 'image/emf', wmf: 'image/wmf', mp4: 'video/mp4',
};

interface PptxContent {
  text: string;
  media: { name: string; bytes: Uint8Array; contentType: string }[];
}

/**
 * Pulls text and embedded media out of a .pptx locally. A .pptx is a zip:
 * each slide is ppt/slides/slideN.xml with every visible text run in an
 * <a:t> element, and images/charts live under ppt/media/. Layout and
 * styling are deliberately dropped.
 */
function extractPptx(pptxBytes: Buffer): PptxContent {
  const files = unzipSync(new Uint8Array(pptxBytes));

  const slides = Object.keys(files)
    .map((path) => ({ path, m: path.match(/^ppt\/slides\/slide(\d+)\.xml$/) }))
    .filter((e): e is { path: string; m: RegExpMatchArray } => e.m !== null)
    .sort((a, b) => Number(a.m[1]) - Number(b.m[1]));

  if (!slides.length) throw new Error('No slides found — not a valid .pptx?');

  const parts: string[] = [];
  for (const { path, m } of slides) {
    const xml = Buffer.from(files[path]).toString('utf-8');
    const runs = [...xml.matchAll(/<a:t[^>]*>([^<]*)<\/a:t>/g)]
      .map((r) => decodeXmlEntities(r[1]))
      .filter((t) => t.trim().length > 0);
    parts.push(`[Slide ${m[1]}]\n${runs.join('\n')}`);
  }

  const media = Object.keys(files)
    .filter((p) => p.startsWith('ppt/media/'))
    .sort()
    .map((p) => {
      const name = p.slice('ppt/media/'.length);
      const ext = name.split('.').pop()?.toLowerCase() ?? '';
      return { name, bytes: files[p], contentType: MEDIA_CONTENT_TYPES[ext] ?? 'application/octet-stream' };
    });

  return { text: parts.join('\n\n'), media };
}

/**
 * Gets a presentation as .pptx bytes. Uploaded .pptx files download as-is;
 * native Google Slides are exported to .pptx (files.export creates nothing
 * on Drive, so no storage quota involved — unlike the copy-to-Slides
 * converter, which needs storage the service account doesn't have).
 * Returns null when a native Slides deck exceeds the export size limit;
 * the caller falls back to text-only extraction.
 */
async function getPresentationPptx(drive: drive_v3.Drive, file: GFile): Promise<Buffer | null> {
  if (file.mimeType !== GOOGLE_SLIDES_MIME) {
    return downloadFileBytes(drive, file.id);
  }
  try {
    const res = await drive.files.export(
      { fileId: file.id, mimeType: PPTX_MIME },
      { responseType: 'stream' },
    );
    return await streamToBuffer(res.data as unknown as Readable);
  } catch {
    return null; // export cap (~10MB) — fall back to plain-text export
  }
}

/** Text-only fallback for native Slides decks too large to export as .pptx. */
async function exportSlidesText(drive: drive_v3.Drive, fileId: string): Promise<string> {
  const res = await drive.files.export(
    { fileId, mimeType: 'text/plain' },
    { responseType: 'stream' },
  );
  return (await streamToBuffer(res.data as unknown as Readable)).toString('utf-8');
}

async function downloadFileBytes(drive: drive_v3.Drive, fileId: string): Promise<Buffer> {
  const res = await drive.files.get(
    { fileId, alt: 'media', supportsAllDrives: true },
    { responseType: 'arraybuffer' },
  );
  return Buffer.from(res.data as ArrayBuffer);
}

export interface SyncResult {
  synced: string[];
  skipped: string[];
  errors: { file: string; error: string }[];
}

/**
 * Walks `<root>/<regatta>/<folder named "NN-Powerpoint">/` and syncs every
 * file found inside into Firebase. A file already synced at its current
 * Drive `modifiedTime` is skipped, so calling this repeatedly (e.g. on a
 * schedule) only does work when something actually changed.
 */
export async function syncPowerpointFolders(rootFolderId: string): Promise<SyncResult> {
  const auth = getSyncAuth();
  const drive = google.drive({ version: 'v3', auth });
  const firestore = db();

  const synced: string[] = [];
  const skipped: string[] = [];
  const errors: { file: string; error: string }[] = [];

  const regattaFolders = (await listChildren(drive, rootFolderId))
    .filter((f) => f.mimeType === FOLDER_MIME);

  for (const regatta of regattaFolders) {
    const powerpointFolders = (await listChildren(drive, regatta.id))
      .filter((f) => f.mimeType === FOLDER_MIME && isPowerpointFolder(f.name));

    for (const folder of powerpointFolders) {
      const items = (await listChildren(drive, folder.id))
        .filter((f) => f.mimeType !== FOLDER_MIME);

      for (const file of items) {
        const docRef = firestore.collection('race_powerpoints').doc(file.id);
        try {
          const existing = await docRef.get();
          if (existing.exists && existing.data()?.driveModifiedTime === file.modifiedTime) {
            skipped.push(file.name);
            continue;
          }

          const base = {
            driveFileId: file.id,
            name: file.name,
            regatta: regatta.name,
            category: folder.name,
            mimeType: file.mimeType,
            driveModifiedTime: file.modifiedTime ?? null,
            syncedAt: FieldValue.serverTimestamp(),
          };

          if (PRESENTATION_MIME_TYPES.has(file.mimeType)) {
            const pptx = await getPresentationPptx(drive, file);
            if (!pptx) {
              // Native Slides deck over the export cap: keep the text at least.
              const textContent = await exportSlidesText(drive, file.id);
              await docRef.set({ ...base, kind: 'presentation', textContent, images: [] });
            } else {
              const { text, media } = extractPptx(pptx);

              /* Everything lands under races/{regatta}/powerpoint/ — race-
                 specific like the existing races/{venue}/1/debrief.md, but
                 always in its own new files: nothing here can overwrite a
                 debrief.md, current.md, or anything else already stored. */
              const raceDir = `races/${regatta.name}/powerpoint`;

              // The original deck, downloadable from Storage.
              const deckName = /\.pptx?$/i.test(file.name) ? file.name : `${file.name}.pptx`;
              const deckPath = `${raceDir}/${deckName}`;
              await bucket().file(deckPath).save(pptx, { contentType: PPTX_MIME });

              // The extracted text as its own markdown file beside the deck.
              const stem = deckName.replace(/\.pptx?$/i, '');
              const textPath = `${raceDir}/${stem}.md`;
              await bucket().file(textPath).save(text, { contentType: 'text/markdown; charset=utf-8' });

              // Embedded images, each its own object beside the deck.
              const images: string[] = [];
              for (const m of media) {
                const mediaPath = `${raceDir}/media/${m.name}`;
                await bucket().file(mediaPath).save(Buffer.from(m.bytes), { contentType: m.contentType });
                images.push(mediaPath);
              }

              await docRef.set({
                ...base,
                kind: 'presentation',
                textContent: text,
                storagePath: deckPath,
                textPath,
                sizeBytes: pptx.length,
                images,
              });
            }
          } else {
            const bytes = await downloadFileBytes(drive, file.id);
            const storagePath = `races/${regatta.name}/powerpoint/${file.name}`;
            await bucket().file(storagePath).save(bytes, { contentType: file.mimeType });
            await docRef.set({ ...base, kind: 'file', storagePath, sizeBytes: bytes.length });
          }

          synced.push(file.name);
        } catch (err) {
          errors.push({ file: file.name, error: err instanceof Error ? err.message : String(err) });
        }
      }
    }
  }

  return { synced, skipped, errors };
}
