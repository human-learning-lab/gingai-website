import { initializeApp, getApps, getApp, cert, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import type { Bucket } from '@google-cloud/storage';

/**
 * Firestore access for server code — API routes and server components only.
 *
 * The app authenticates with Clerk, not Firebase Auth, so Firestore security
 * rules have no `request.auth` to check. Rules therefore deny the client
 * outright and all reads and writes go through here, behind a Clerk-gated
 * /api route. The Admin SDK bypasses rules by design, which is what makes
 * that safe: the route is the access check.
 *
 * FIREBASE_PRIVATE_KEY is a real secret, unlike the public web config in
 * `firebase.ts`. It is stored with literal \n escapes in the environment,
 * so it needs unescaping before use.
 */
function adminApp(): App {
  if (getApps().length) return getApp();

  const projectId   = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey  = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Firebase Admin is not configured. Set FIREBASE_CLIENT_EMAIL and ' +
      'FIREBASE_PRIVATE_KEY from Project settings -> Service accounts.',
    );
  }

  return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
}

/** Call inside a request handler, not at module scope — it throws when unconfigured. */
export function db(): Firestore {
  return getFirestore(adminApp());
}

/**
 * Firebase Storage access for server code, via the Admin SDK.
 *
 * `sailorStore.ts` writes storage through the plain REST API instead — that
 * was to dodge the *client* `firebase/storage` SDK, which assumes a browser.
 * The Admin SDK has no such assumption (it's the same credential path as
 * `db()` above), so there's no reason to repeat that workaround here.
 */
export function bucket(): Bucket {
  const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  if (!bucketName) throw new Error('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET is not configured');
  return getStorage(adminApp()).bucket(bucketName);
}
