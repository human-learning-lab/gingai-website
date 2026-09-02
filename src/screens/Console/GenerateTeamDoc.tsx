"use client";

import { useState } from "react";

/* ============================================================
   TEMPORARY — a hand-crank on the squad context pipeline.

   TODO: remove this component, its mount in
   app/(protected)/console/page.tsx, and the route at
   app/api/team-report/regenerate, once the squad file is
   rebuilt on a schedule or off the back of the debrief rather
   than by someone pressing a button. The pipeline it drives
   (generateTeamContext in src/lib/sailorReport.ts) is meant to
   stay — this is only the crank on the front of it.

   Reads every sailor's context file and writes the squad-level
   one to team/current.md.

   Unlike the per-sailor version, which is unmounted, this one
   ships to production deliberately: there is no other way to
   rebuild the squad file yet. It is kept small and marked so
   nobody mistakes it for finished furniture, but it does cost
   one model call across every sailor file, so it is not a
   button to lean on.
   ============================================================ */

interface Result {
  path: string;
  versionId: string;
  url?: string;
  sailors: string[];
  revised: boolean;
  content: string;
}

const muted = "var(--text3, #6B5F4E)";

export default function GenerateTeamDoc() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

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
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not generate the team file");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      style={{
        display: "flex",
        alignItems: "center",
        gap: 9,
        flexWrap: "wrap",
        marginBottom: 14,
        padding: "6px 10px",
        borderRadius: 5,
        border: "1px dashed var(--line, #CFC4B0)",
        background: "transparent",
        fontSize: 11.5,
        color: muted,
      }}
    >
      <span
        style={{
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: "0.09em",
          textTransform: "uppercase",
          color: "var(--yellow, #B07800)",
        }}
      >
        Temporary
      </span>

      <button
        onClick={generate}
        disabled={busy}
        style={{
          padding: "3px 9px",
          border: "1px solid var(--line, #CFC4B0)",
          borderRadius: 4,
          background: "transparent",
          color: busy ? muted : "var(--text, #1A1A18)",
          fontSize: 11.5,
          fontWeight: 600,
          cursor: busy ? "not-allowed" : "pointer",
        }}
      >
        {busy ? "Reading the squad…" : "Rebuild team context file"}
      </button>

      {error && <span style={{ color: "var(--red, #E8574A)" }}>{error}</span>}

      {result && (
        <>
          <span>
            {result.revised ? "Revised" : "Written"} from {result.sailors.length} file
            {result.sailors.length === 1 ? "" : "s"}
          </span>
          {/* The document itself is behind a toggle: this is a maintenance
              control, not somewhere to read the squad file. */}
          <button
            onClick={() => setOpen((v) => !v)}
            style={{
              border: "none",
              background: "transparent",
              color: muted,
              fontSize: 11.5,
              textDecoration: "underline",
              cursor: "pointer",
              padding: 0,
            }}
          >
            {open ? "hide" : "show"}
          </button>
        </>
      )}

      {result && open && (
        <pre
          style={{
            flexBasis: "100%",
            margin: "6px 0 0",
            maxHeight: 260,
            overflow: "auto",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            fontSize: 12,
            lineHeight: 1.5,
            padding: 10,
            borderRadius: 4,
            background: "var(--bg, #F7F2EA)",
            border: "1px solid var(--line, #CFC4B0)",
            color: "var(--text, #1A1A18)",
          }}
        >
          {result.content}
        </pre>
      )}
    </section>
  );
}
