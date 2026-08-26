import type { SailorReport } from './sailorReport';

/**
 * Firestore persistence for per-sailor documents.
 *
 * Uses the REST API rather than the client SDK. The SDK talks gRPC over a
 * long-lived stream, which does not settle inside a Next.js request handler —
 * writes hang for minutes and log "GRPC error has no .code". REST is a plain
 * fetch, so it works in any runtime.
 *
 * It also needs no service account: rules are currently open, so the public
 * web API key is enough. When access moves behind Clerk-gated routes properly,
 * switch to the Admin SDK in firebaseAdmin.ts, which bypasses rules and does
 * not depend on them being permissive.
 *
 * Shape: `sailor/{name}` holds the current document so a read is one lookup,
 * and `sailor/{name}/versions/{auto}` keeps every prior generation —
 * regenerating over a single mutable field would quietly destroy an athlete's
 * own record of what they said.
 */

const PROJECT = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const ROOT = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

type Value =
  | { stringValue: string }
  | { booleanValue: boolean }
  | { integerValue: string }
  | { mapValue: { fields: Record<string, Value> } };

/** Firestore REST wants every value tagged with its type. */
function toValue(v: unknown): Value {
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return { integerValue: String(Math.trunc(v)) };
  if (v && typeof v === 'object') {
    return {
      mapValue: {
        fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, toValue(x)])),
      },
    };
  }
  return { stringValue: String(v ?? '') };
}

function toFields(obj: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, toValue(v)]));
}

async function write(url: string, method: 'POST' | 'PATCH', fields: Record<string, unknown>) {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: toFields(fields) }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Firestore ${method} ${res.status}: ${body.slice(0, 300)}`);
  }
  return res.json() as Promise<{ name: string }>;
}

export async function saveSailorReport(report: SailorReport) {
  if (!PROJECT || !API_KEY) throw new Error('Firebase project id or API key is not configured');

  const id = encodeURIComponent(report.sailor);
  const body = {
    sailor: report.sailor,
    content: report.content,
    runId: report.runId,
    sources: report.sources,
    updatedAt: report.generatedAt,
  };

  // PATCH with no updateMask creates the document if it is absent.
  await write(`${ROOT}/sailor/${id}?key=${API_KEY}`, 'PATCH', body);

  const version = await write(
    `${ROOT}/sailor/${id}/versions?key=${API_KEY}`,
    'POST',
    { ...body, generatedAt: report.generatedAt },
  );

  return {
    path: `sailor/${report.sailor}`,
    versionId: version.name.split('/').pop() ?? '',
  };
}
