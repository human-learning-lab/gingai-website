import { getFirestore, doc, setDoc, collection, addDoc } from 'firebase/firestore';
import { firebaseApp } from './firebase';
import type { SailorReport } from './sailorReport';

/**
 * Firestore persistence for per-sailor documents.
 *
 * Uses the client SDK because rules are currently open — see firestore.rules.
 * When access moves behind Clerk-gated /api routes this should switch to the
 * Admin SDK in firebaseAdmin.ts, which bypasses rules entirely.
 *
 * Shape: `sailor/{name}` holds the living document — the current version, so
 * a read is one lookup. `sailor/{name}/versions/{auto}` keeps every prior
 * generation, because regenerating daily over a single mutable field would
 * quietly destroy an athlete's own record of what they said.
 */
export async function saveSailorReport(report: SailorReport) {
  const db = getFirestore(firebaseApp);
  const ref = doc(db, 'sailor', report.sailor);

  await setDoc(ref, {
    sailor:      report.sailor,
    content:     report.content,
    runId:       report.runId,
    sources:     report.sources,
    updatedAt:   report.generatedAt,
  }, { merge: true });

  const version = await addDoc(collection(ref, 'versions'), {
    content:     report.content,
    runId:       report.runId,
    sources:     report.sources,
    generatedAt: report.generatedAt,
  });

  return { path: ref.path, versionId: version.id };
}
