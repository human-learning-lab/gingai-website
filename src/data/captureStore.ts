import type { Transcript } from './transcripts';

let captured: Transcript[] = [];
const listeners = new Set<() => void>();

export function addCapture(t: Transcript) {
  captured = [t, ...captured];
  listeners.forEach(fn => fn());
}

export function getCaptured(): Transcript[] {
  return captured;
}

export function subscribeCapture(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
