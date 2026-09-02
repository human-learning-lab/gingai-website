import type { SailorReport } from './sailorReport';

/**
 * Per-sailor documents, stored in Firebase Storage.
 *
 * The bodies are prose, not queryable data, so they belong in a bucket: no
 * 1 MB document ceiling, and they can be fetched or downloaded directly.
 *
 * Uses the Storage REST API rather than the SDK, because the SDKs assume a
 * browser and do not settle inside a Next.js request handler.
 *
 * Layout:
 *   team/current.md                     the squad context file
 *   team/versions/{doc}-{iso}.md
 *   team/sailors/{name}/current.md      the sailor's context file
 *   team/sailors/{name}/daily.md        the latest end-of-day report
 *   team/sailors/{name}/versions/{doc}-{iso}.md
 *
 * The versions copy is not optional. Storage keeps no history unless object
 * versioning is enabled on the bucket, so overwriting alone would destroy an
 * athlete's own record of what they said.
 */

const BUCKET = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
/* Everything lives under one team root, so a second team becomes another
   prefix rather than a restructure. */
const TEAM = 'team';
const API = 'https://firebasestorage.googleapis.com/v0/b';

interface UploadResult {
  name: string;
  downloadTokens?: string;
}

export interface StoredDoc {
  path: string;
  versionId: string;
  /** Direct link, readable without the SDK. Absent if the bucket issues no token. */
  url?: string;
}

/** Object paths are a single URL-encoded segment — slashes become %2F. */
function objectUrl(path: string) {
  return `${API}/${BUCKET}/o/${encodeURIComponent(path)}`;
}

async function put(path: string, body: string, meta: Record<string, string>) {
  const res = await fetch(
    `${API}/${BUCKET}/o?uploadType=media&name=${encodeURIComponent(path)}`,
    { method: 'POST', headers: { 'Content-Type': 'text/markdown; charset=utf-8' }, body },
  );

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    if (res.status === 404) {
      throw new Error(
        `Storage bucket "${BUCKET}" not found. Enable Firebase Storage for this ` +
        `project (console -> Storage -> Get Started), then run npm run rules:deploy.`,
      );
    }
    throw new Error(`Storage upload ${res.status}: ${detail.slice(0, 300)}`);
  }

  const uploaded = await res.json() as UploadResult;

  /* Custom metadata has to follow the upload. This endpoint silently discards
     X-Goog-Meta-* headers sent with the body — verified by setting them and
     reading the object back empty. Provenance is a nicety, so a failure here
     is not worth failing the write over. */
  await fetch(objectUrl(path), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ metadata: meta }),
  }).catch(() => undefined);

  return uploaded;
}

/** Fetches an object's body, or null when it does not exist. */
async function readObject(path: string): Promise<string | null> {
  // The metadata call carries the download token the media fetch needs.
  const metaRes = await fetch(objectUrl(path), { cache: 'no-store' });
  if (!metaRes.ok) return null;
  const meta = await metaRes.json().catch(() => null) as UploadResult | null;
  const token = meta?.downloadTokens?.split(',')[0];
  if (!token) return null;

  const res = await fetch(`${objectUrl(path)}?alt=media&token=${token}`, { cache: 'no-store' });
  return res.ok ? res.text() : null;
}

/** Path-safe sailor name — the bucket key, not the display name. */
export function sailorKey(sailor: string) {
  return sailor.trim().replace(/[^\w.-]+/g, '_');
}

/**
 * Writes one document plus its versioned copy.
 * `docName` is the file name, e.g. "current.md" or "daily.md".
 */
export async function saveSailorDoc(
  sailor: string,
  docName: string,
  content: string,
  generatedAt: string,
): Promise<StoredDoc> {
  if (!BUCKET) throw new Error('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET is not configured');

  const key = sailorKey(sailor);
  const base = docName.replace(/\.md$/, '');
  // Timestamps carry colons, which are awkward in object paths.
  const stamp = generatedAt.replace(/[:.]/g, '-');

  const currentPath = `${TEAM}/sailors/${key}/${docName}`;
  const versionPath = `${TEAM}/sailors/${key}/versions/${base}-${stamp}.md`;
  const meta = { sailor, kind: base, generatedAt };

  const [current] = await Promise.all([
    put(currentPath, content, meta),
    put(versionPath, content, meta),
  ]);

  const token = current.downloadTokens?.split(',')[0];

  return {
    path: currentPath,
    versionId: stamp,
    url: token ? `${objectUrl(currentPath)}?alt=media&token=${token}` : undefined,
  };
}

/** Reads a sailor's current document back, or null when none exists yet. */
export async function readSailorDoc(sailor: string, docName: string): Promise<string | null> {
  if (!BUCKET) return null;
  return readObject(`${TEAM}/sailors/${sailorKey(sailor)}/${docName}`);
}

/** The end-of-day report. Kept separate from the standing profile. */
export function saveDailyReport(report: SailorReport) {
  return saveSailorDoc(report.sailor, 'daily.md', report.content, report.generatedAt);
}

/* ── Team-level documents ──────────────────────────────────────
 * The squad context file: what the sailors have in common, read across every
 * individual file rather than compiled from transcripts directly.
 */

/** Writes team/{docName} plus a versioned copy. */
export async function saveTeamDoc(
  docName: string,
  content: string,
  generatedAt: string,
): Promise<StoredDoc> {
  if (!BUCKET) throw new Error('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET is not configured');

  const base = docName.replace(/\.md$/, '');
  const stamp = generatedAt.replace(/[:.]/g, '-');
  const currentPath = `${TEAM}/${docName}`;
  const meta = { sailor: 'team', kind: base, generatedAt };

  const [current] = await Promise.all([
    put(currentPath, content, meta),
    put(`${TEAM}/versions/${base}-${stamp}.md`, content, meta),
  ]);

  const token = current.downloadTokens?.split(',')[0];
  return {
    path: currentPath,
    versionId: stamp,
    url: token ? `${objectUrl(currentPath)}?alt=media&token=${token}` : undefined,
  };
}

export async function readTeamDoc(docName: string): Promise<string | null> {
  if (!BUCKET) return null;
  return readObject(`${TEAM}/${docName}`);
}

/**
 * Every sailor with a context file.
 *
 * Storage has no directories, so the listing is flat and the names come from
 * the object paths. `delimiter` would give prefixes directly but is not
 * supported on the v0 endpoint, so paths are parsed instead.
 */
export async function listSailors(): Promise<string[]> {
  if (!BUCKET) return [];
  const res = await fetch(
    `${API}/${BUCKET}/o?prefix=${encodeURIComponent(`${TEAM}/sailors/`)}&maxResults=1000`,
    { cache: 'no-store' },
  );
  if (!res.ok) return [];
  const data = await res.json().catch(() => null) as { items?: { name: string }[] } | null;

  const names = new Set<string>();
  for (const item of data?.items ?? []) {
    const m = item.name.match(/^team\/sailors\/([^/]+)\/current\.md$/);
    if (m) names.add(decodeURIComponent(m[1]));
  }
  return [...names].sort();
}
