"use client";

import { useState } from "react";

/* ============================================================
   TEMPORARY — DELETE BEFORE MERGING TO MAIN.

   TODO(alpha): remove this component, its mount in
   app/(protected)/console/page.tsx, and the route at
   app/api/sailor-report/regenerate. The pipeline it drives
   (src/lib/sailorReport.ts, src/lib/sailorStore.ts) is meant to
   stay — this is only the hand-crank on the front of it.

   Rebuilds a sailor's standing profile from all of their
   transcribed speech and writes sailors/{name}/current.md.

   Why it must not ship: it regenerates any sailor's profile on
   demand from anyone who can reach /console, it costs a model
   call per press, and attribution of uploads is matched on the
   free-text title — so a recording titled with the wrong name
   lands in that sailor's profile as their own words.

   It renders only when NEXT_PUBLIC_TEAM=hll, which is never set
   on Vercel Production, so it cannot reach the live app even if
   this TODO is missed.
   ============================================================ */

const IS_ALPHA = process.env.NEXT_PUBLIC_TEAM === "hll";

interface Result {
  path: string;
  versionId: string;
  url?: string;
  revised: boolean;
  scanned: { rows: number; totalChars: number; usedChars: number };
  content: string;
}

export default function RegenerateSailorDoc() {
  const [sailor, setSailor] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function regenerate() {
    const name = sailor.trim();
    if (!name || busy) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/sailor-report/regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // No chars limit: scan the sailor's whole corpus.
        body: JSON.stringify({ sailor: name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
      setResult(data as Result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not regenerate");
    } finally {
      setBusy(false);
    }
  }

  if (!IS_ALPHA) return null;

  return (
    <section
      style={{
        border: "1px solid var(--amber, #B07800)",
        borderRadius: 6,
        background: "var(--bg2, #EDE6D8)",
        padding: 16,
        marginBottom: 22,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            padding: "3px 8px",
            borderRadius: 3,
            color: "var(--yellow, #B07800)",
            border: "1px solid var(--yellow, #B07800)",
            background: "var(--yg, rgba(176,120,0,0.10))",
          }}
        >
          Temporary
        </span>
        <strong style={{ fontSize: 14 }}>Regenerate sailor profile</strong>
        <span style={{ fontSize: 12, color: "var(--text3, #6B5F4E)" }}>
          Alpha only — reads everything they have transcribed. Delete before merging to main.
        </span>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input
          value={sailor}
          onChange={(e) => setSailor(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") regenerate(); }}
          placeholder="Username, e.g. Martine"
          aria-label="Sailor username"
          disabled={busy}
          style={{
            flex: "1 1 220px",
            minWidth: 0,
            padding: "9px 12px",
            border: "1px solid var(--line2, #BFB29C)",
            borderRadius: 4,
            background: "var(--bg, #F7F2EA)",
            color: "var(--text, #1A1610)",
            fontSize: 14,
          }}
        />
        <button
          onClick={regenerate}
          disabled={busy || !sailor.trim()}
          style={{
            padding: "9px 18px",
            border: "none",
            borderRadius: 4,
            background: busy || !sailor.trim() ? "var(--line2, #BFB29C)" : "var(--green, #009B3A)",
            color: "#fff",
            fontSize: 14,
            fontWeight: 600,
            cursor: busy || !sailor.trim() ? "not-allowed" : "pointer",
          }}
        >
          {busy ? "Regenerating…" : "Regenerate"}
        </button>
      </div>

      {error && (
        <p style={{ margin: 0, fontSize: 13, color: "var(--red, #E8574A)" }}>{error}</p>
      )}

      {result && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <p style={{ margin: 0, fontSize: 12, color: "var(--text3, #6B5F4E)" }}>
            Saved to{" "}
            {result.url
              ? <a href={result.url} target="_blank" rel="noreferrer"><code>{result.path}</code></a>
              : <code>{result.path}</code>}
            {" "}· {result.scanned.rows} rows, {result.scanned.usedChars.toLocaleString()} chars scanned ·
            {" "}{result.revised ? "revised existing profile" : "first profile"}
          </p>
          <pre
            style={{
              margin: 0,
              maxHeight: 320,
              overflow: "auto",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              fontSize: 13,
              lineHeight: 1.5,
              padding: 12,
              borderRadius: 4,
              background: "var(--bg, #F7F2EA)",
              border: "1px solid var(--line, #CFC4B0)",
            }}
          >
            {result.content}
          </pre>
        </div>
      )}
    </section>
  );
}
