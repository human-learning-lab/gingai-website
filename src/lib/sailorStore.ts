import type { SailorReport } from './sailorReport';

/**
 * Per-sailor documents, stored in Firebase Storage.
 *
 * The document body is prose, not queryable data, so it belongs in a bucket
 * rather than a Firestore field — no 1 MB document ceiling, and it can be
 * fetched or downloaded directly.
 *
 * Uses the Storage REST API rather than the SDK, for the same reason the
 * Firestore write did: the SDKs assume a browser and do not settle cleanly
 * inside a Next.js request handler. REST is a plain fetch and works anywhere.
 *
 * Layout:
 *   sailors/{name}/current.md            the living document
 *   sailors/{name}/versions/{iso}.md     every prior generation
 *
 * The versions copy is not optional. Regenerating over a single object would
 * quietly destroy an athlete's own record of what they said, and Storage has
 * no history unless object versioning is enabled on the bucket.
 */

const BUCKET = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
const API = 'https://firebasestorage.googleapis.com/v0/b';

interface UploadResult {
  name: string;
  downloadTokens?: string;
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
        'X-Goog-Meta-Run-Id': meta.runId,
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

export async function saveSailorReport(report: SailorReport) {
  if (!BUCKET) throw new Error('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET is not configured');

  const safeName = report.sailor.trim().replace(/[^\w.-]+/g, '_');
  const meta = {
    sailor: report.sailor,
    runId: report.runId,
    generatedAt: report.generatedAt,
  };

  // Timestamps carry colons, which are awkward in object paths.
  const stamp = report.generatedAt.replace(/[:.]/g, '-');
  const currentPath = `sailors/${safeName}/current.md`;
  const versionPath = `sailors/${safeName}/versions/${stamp}.md`;

  const [current] = await Promise.all([
    put(currentPath, report.content, meta),
    put(versionPath, report.content, meta),
  ]);

  const token = current.downloadTokens?.split(',')[0];

  return {
    path: currentPath,
    versionId: stamp,
    /** Direct link, readable without the SDK. Absent if the bucket issues no token. */
    url: token ? `${objectUrl(currentPath)}?alt=media&token=${token}` : undefined,
  };
}
