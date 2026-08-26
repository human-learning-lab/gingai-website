import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';

/**
 * Firebase client SDK.
 *
 * These values are public by design — a Firebase web API key identifies the
 * project, it does not authorise anything. Access is controlled by Firestore
 * security rules, not by keeping this config secret.
 *
 * They are read from the environment anyway so alpha and production can point
 * at separate Firebase projects, which is how we get the data isolation the
 * shared MySQL cannot give us.
 *
 * NOTE: do not read Firestore from the browser with this. Rules gate on
 * `request.auth`, which Clerk never populates, so a client read would need
 * open rules. Go through an /api route and `firebaseAdmin` instead.
 */
const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/** Next.js re-executes modules on hot reload; reuse the app rather than re-initialising. */
export const firebaseApp: FirebaseApp =
  getApps().length ? getApp() : initializeApp(firebaseConfig);
