/**
 * Base URL for links we send to people — WhatsApp priming and capture links.
 *
 * Deployed, the current origin is right: a link sent from alpha should open
 * alpha, and one sent from production should open production.
 *
 * On localhost the origin is useless — the recipient cannot open it — so it
 * falls back to NEXT_PUBLIC_APP_URL. Point that at the alpha deployment while
 * testing, or links sent from your machine land on the live app against the
 * real team's data.
 */
const FALLBACK = 'https://gingai-website.vercel.app';

export function shareBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '');

  if (typeof window !== 'undefined') {
    const { origin, hostname } = window.location;
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.local');
    if (!isLocal) return origin;
  }

  return configured || FALLBACK;
}
