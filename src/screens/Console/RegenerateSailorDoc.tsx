"use client";

import { useState } from "react";

/* ============================================================
   Testing tool — rebuild a sailor's document from the tail of
   their transcribed speech and write it to Firestore.

   Attribution of uploads is matched on the free-text title, so
   this is only as reliable as the naming convention. Remove or
   gate this once per-sailor attribution exists in the backend.
   ============================================================ */

interface Result {
  path: string;
  versionId: string;
  scanned: { rows: number; totalChars: number; usedChars: number };
  content: string;
}

const CHARS = 2000;

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
        body: JSON.stringify({ sailor: name, chars: CHARS }),
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

  return (
    <section
      style={{
        border: "1px solid var(--line, #CFC4B0)",
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
        <strong style={{ fontSize: 14 }}>Regenerate sailor document</strong>
        <span style={{ fontSize: 12, color: "var(--text3, #6B5F4E)" }}>
          Testing — reads the last {CHARS.toLocaleString()} characters of their transcribed speech
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
            Saved to <code>{result.path}</code> · version <code>{result.versionId}</code> ·
            {" "}{result.scanned.rows} rows, {result.scanned.totalChars.toLocaleString()} chars found,
            {" "}{result.scanned.usedChars.toLocaleString()} used
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
