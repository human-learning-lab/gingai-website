/**
 * Scheduled Cloud Function: syncs each race's Powerpoint folder from the
 * Brazil team's Google Drive into this Firebase project (hll-ginga).
 *
 * Every 15 minutes it walks <root>/<regatta>/<NN-Powerpoint folder>/ on
 * Drive and, for each new or changed file:
 *   - presentations (.pptx / Google Slides): extracts slide text locally
 *     (a .pptx is a zip — no Drive converter, no storage quota involved)
 *     into a Firestore doc at race_powerpoints/{driveFileId}, and stores
 *     the original deck, the text as its own .md file, and every embedded
 *     image under races/{regatta}/powerpoint/ in Storage;
 *   - anything else: uploads the bytes to the same Storage folder with a
 *     pointer doc in Firestore.
 *
 * Files already synced at their current Drive modifiedTime are skipped,
 * so most runs do nothing. All Storage paths are new files — existing
 * debrief.md / current.md documents can never be overwritten from here.
 *
 * This is the same logic as src/lib/powerpointSync.ts in the Next app,
 * adapted for the Functions runtime: Firestore/Storage use the project's
 * own default credentials (no env config), and the Drive service-account
 * key comes from Secret Manager instead of .env.
 *
 * Setup (one-time):
 *   firebase functions:secrets:set DRIVE_SA_KEY   # paste the full JSON of
 *       adk-agent-sa@ginga-ai (the robot the Brazil team's Drive is shared
 *       with; Drive scope here is read-only)
 *   firebase deploy --only functions
 */

import { onSchedule } from 'firebase-functions/v2/scheduler';
import { defineSecret } from 'firebase-functions/params';
import { logger } from 'firebase-functions';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { google } from 'googleapis';
import { unzipSync } from 'fflate';

initializeApp();

const DRIVE_SA_KEY = defineSecret('DRIVE_SA_KEY');

// The Brazil team's season root folder (same ID the website's Library reads).
const ROOT_FOLDER_ID = '1MfoIcFbP0zlAxMNwgMQN4cu-YHCpdquF';
const STORAGE_BUCKET = 'hll-ginga.firebasestorage.app';

const FOLDER_MIME = 'application/vnd.google-apps.folder';
const GOOGLE_SLIDES_MIME = 'application/vnd.google-apps.presentation';
const PPTX_MIME = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
const PRESENTATION_MIME_TYPES = new Set([GOOGLE_SLIDES_MIME, PPTX_MIME]);

const POWERPOINT_FOLDER_RE = /^\d+[-_ ]*powerpoint$/i;
const isPowerpointFolder = (name) =>
  POWERPOINT_FOLDER_RE.test(name.trim()) || name.trim().toLowerCase() === 'powerpoint';

const MEDIA_CONTENT_TYPES = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif',
  webp: 'image/webp', bmp: 'image/bmp', svg: 'image/svg+xml', tiff: 'image/tiff',
  emf: 'image/emf', wmf: 'image/wmf', mp4: 'video/mp4',
};

function decodeXmlEntities(s) {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, '&'); // last, so "&amp;lt;" doesn't double-decode
}

function extractPptx(pptxBytes) {
  const files = unzipSync(new Uint8Array(pptxBytes));

  const slides = Object.keys(files)
    .map((path) => ({ path, m: path.match(/^ppt\/slides\/slide(\d+)\.xml$/) }))
    .filter((e) => e.m !== null)
    .sort((a, b) => Number(a.m[1]) - Number(b.m[1]));

  if (!slides.length) throw new Error('No slides found — not a valid .pptx?');

  const parts = [];
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

async function listChildren(drive, folderId) {
  const results = [];
  let pageToken;
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
      if (f.id && f.name && f.mimeType) results.push(f);
    }
    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);
  return results;
}

async function downloadFileBytes(drive, fileId) {
  const res = await drive.files.get(
    { fileId, alt: 'media', supportsAllDrives: true },
    { responseType: 'arraybuffer' },
  );
  return Buffer.from(res.data);
}

async function getPresentationPptx(drive, file) {
  if (file.mimeType !== GOOGLE_SLIDES_MIME) {
    return downloadFileBytes(drive, file.id);
  }
  try {
    const res = await drive.files.export(
      { fileId: file.id, mimeType: PPTX_MIME },
      { responseType: 'arraybuffer' },
    );
    return Buffer.from(res.data);
  } catch {
    return null; // export cap (~10MB) — fall back to plain-text export
  }
}

async function exportSlidesText(drive, fileId) {
  const res = await drive.files.export(
    { fileId, mimeType: 'text/plain' },
    { responseType: 'arraybuffer' },
  );
  return Buffer.from(res.data).toString('utf-8');
}

async function runSync(saKeyJson) {
  const key = JSON.parse(saKeyJson);
  const auth = new google.auth.JWT({
    email: key.client_email,
    key: key.private_key,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });
  const drive = google.drive({ version: 'v3', auth });
  const db = getFirestore();
  const bucket = getStorage().bucket(STORAGE_BUCKET);

  const synced = [];
  const skipped = [];
  const errors = [];

  const regattaFolders = (await listChildren(drive, ROOT_FOLDER_ID))
    .filter((f) => f.mimeType === FOLDER_MIME);

  for (const regatta of regattaFolders) {
    const powerpointFolders = (await listChildren(drive, regatta.id))
      .filter((f) => f.mimeType === FOLDER_MIME && isPowerpointFolder(f.name));

    for (const folder of powerpointFolders) {
      const items = (await listChildren(drive, folder.id))
        .filter((f) => f.mimeType !== FOLDER_MIME);

      for (const file of items) {
        const docRef = db.collection('race_powerpoints').doc(file.id);
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
              const textContent = await exportSlidesText(drive, file.id);
              await docRef.set({ ...base, kind: 'presentation', textContent, images: [] });
            } else {
              const { text, media } = extractPptx(pptx);
              const raceDir = `races/${regatta.name}/powerpoint`;

              const deckName = /\.pptx?$/i.test(file.name) ? file.name : `${file.name}.pptx`;
              const deckPath = `${raceDir}/${deckName}`;
              await bucket.file(deckPath).save(pptx, { contentType: PPTX_MIME });

              const stem = deckName.replace(/\.pptx?$/i, '');
              const textPath = `${raceDir}/${stem}.md`;
              await bucket.file(textPath).save(text, { contentType: 'text/markdown; charset=utf-8' });

              const images = [];
              for (const m of media) {
                const mediaPath = `${raceDir}/media/${m.name}`;
                await bucket.file(mediaPath).save(Buffer.from(m.bytes), { contentType: m.contentType });
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
            await bucket.file(storagePath).save(bytes, { contentType: file.mimeType });
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

export const syncDrivePowerpoints = onSchedule(
  {
    schedule: 'every 15 minutes',
    region: 'europe-west1',
    secrets: [DRIVE_SA_KEY],
    timeoutSeconds: 300,
    memory: '512MiB',
  },
  async () => {
    const result = await runSync(DRIVE_SA_KEY.value());
    if (result.errors.length) {
      logger.error('sync finished with errors', result);
    } else {
      logger.info('sync finished', {
        synced: result.synced.length,
        skipped: result.skipped.length,
        files: result.synced,
      });
    }
  },
);
