"use client";

import { useState } from "react";

/* ============================================================
   TEMPORARY — DELETE BEFORE MERGING TO MAIN.

   TODO(alpha): remove this component, its mount in
   app/(protected)/console/page.tsx, and the route at
   app/api/team-report/regenerate. The pipeline it drives
   (generateTeamContext in src/lib/sailorReport.ts) is meant
   to stay — this is only the hand-crank on the front of it.

   Reads every sailor's context file and writes the squad-level
   one to team/current.md.

   Why it must not ship: it regenerates the squad file on demand
   for anyone who can reach /console, and costs one model call
   over every sailor file at once.

   It renders only when NEXT_PUBLIC_TEAM=hll, which is never set
   on Vercel Production, so it cannot reach the live app even if
   this TODO is missed.
   ============================================================ */

const IS_ALPHA = process.env.NEXT_PUBLIC_TEAM === "hll";

interface Result {
  path: string;
  versionId: string;
  url?: string;
  sailors: string[];
  revised: boolean;
  content: string;
}

export default function GenerateTeamDoc() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    if (busy) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/team-report/regenerate", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
      setResult(data as Result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not generate the team file");
    } finally {
      setBusy(false);
    }
  }

  if (!IS_ALPHA) return null;

  return (
    <section
      style={{
        border: "1px solid var(--yellow, #B07800)",
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
        <strong style={{ fontSize: 14 }}>Generate team context file</strong>
        <span style={{ fontSize: 12, color: "var(--text3, #6B5F4E)" }}>
          Alpha only — reads every sailor&rsquo;s file. Delete before merging to main.
        </span>
      </div>

      <button
        onClick={generate}
        disabled={busy}
        style={{
          alignSelf: "flex-start",
          padding: "9px 18px",
          border: "none",
          borderRadius: 4,
          background: busy ? "var(--line2, #BFB29C)" : "var(--navy, #0A1628)",
          color: "#fff",
          fontSize: 14,
          fontWeight: 600,
          cursor: busy ? "not-allowed" : "pointer",
        }}
      >
        {busy ? "Reading the squad…" : "Generate team context file"}
      </button>

      {error && <p style={{ margin: 0, fontSize: 13, color: "var(--red, #E8574A)" }}>{error}</p>}

      {result && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <p style={{ margin: 0, fontSize: 12, color: "var(--text3, #6B5F4E)" }}>
            Saved to{" "}
            {result.url
              ? <a href={result.url} target="_blank" rel="noreferrer"><code>{result.path}</code></a>
              : <code>{result.path}</code>}
            {" "}· read {result.sailors.length} sailor{result.sailors.length === 1 ? "" : "s"}
            {" "}({result.sailors.join(", ")}) ·
            {" "}{result.revised ? "revised existing file" : "first file"}
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
