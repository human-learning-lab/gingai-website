// IndexedDB helper for storing offline audio recordings locally.

const DB_NAME    = 'gingai-offline';
const STORE_NAME = 'recordings';
const DB_VERSION = 1;

export interface OfflineRecording {
  id: string;
  title: string;
  timestamp: number;   // epoch ms
  duration: number;    // seconds
  blob: Blob;
  mimeType: string;
  status: 'pending' | 'uploading' | 'done' | 'error';
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

export async function saveRecording(rec: OfflineRecording): Promise<void> {
  const db   = await openDb();
  const tx   = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  store.put(rec);
  return new Promise((res, rej) => {
    tx.oncomplete = () => res();
    tx.onerror    = () => rej(tx.error);
  });
}

export async function getPendingRecordings(): Promise<OfflineRecording[]> {
  const db    = await openDb();
  const tx    = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  const all: OfflineRecording[] = await new Promise((res, rej) => {
    const req = store.getAll();
    req.onsuccess = () => res(req.result);
    req.onerror   = () => rej(req.error);
  });
  return all.filter(r => r.status === 'pending' || r.status === 'error');
}

export async function updateRecordingStatus(
  id: string,
  status: OfflineRecording['status'],
): Promise<void> {
  const db    = await openDb();
  const tx    = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  const rec: OfflineRecording = await new Promise((res, rej) => {
    const req = store.get(id);
    req.onsuccess = () => res(req.result);
    req.onerror   = () => rej(req.error);
  });
  if (!rec) return;
  store.put({ ...rec, status });
  return new Promise((res, rej) => {
    tx.oncomplete = () => res();
    tx.onerror    = () => rej(tx.error);
  });
}

export async function deleteRecording(id: string): Promise<void> {
  const db    = await openDb();
  const tx    = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  store.delete(id);
  return new Promise((res, rej) => {
    tx.oncomplete = () => res();
    tx.onerror    = () => rej(tx.error);
  });
}
