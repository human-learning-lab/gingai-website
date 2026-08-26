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
 *   sailors/{name}/current.md          the standing profile — who they are
 *   sailors/{name}/daily.md            the latest end-of-day report
 *   sailors/{name}/versions/{doc}-{iso}.md
 *
 * The versions copy is not optional. Storage keeps no history unless object
 * versioning is enabled on the bucket, so overwriting alone would destroy an
 * athlete's own record of what they said.
 */

const BUCKET = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
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
    {
      method: 'POST',
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        // Surfaces in the console and comes back on download, so a stored
        // document carries its own provenance without a database lookup.
        'X-Goog-Meta-Sailor': meta.sailor,
        'X-Goog-Meta-Kind': meta.kind,
        'X-Goog-Meta-Generated-At': meta.generatedAt,
      },
      body,
    },
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

  return res.json() as Promise<UploadResult>;
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

  const currentPath = `sailors/${key}/${docName}`;
  const versionPath = `sailors/${key}/versions/${base}-${stamp}.md`;
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
  const path = `sailors/${sailorKey(sailor)}/${docName}`;

  // The metadata call carries the download token the media fetch needs.
  const metaRes = await fetch(objectUrl(path));
  if (!metaRes.ok) return null;
  const meta = await metaRes.json().catch(() => null) as UploadResult | null;
  const token = meta?.downloadTokens?.split(',')[0];
  if (!token) return null;

  const res = await fetch(`${objectUrl(path)}?alt=media&token=${token}`);
  return res.ok ? res.text() : null;
}

/** The end-of-day report. Kept separate from the standing profile. */
export function saveDailyReport(report: SailorReport) {
  return saveSailorDoc(report.sailor, 'daily.md', report.content, report.generatedAt);
}
