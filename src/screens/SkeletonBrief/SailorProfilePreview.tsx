"use client";

import { useEffect, useState } from "react";

/* ============================================================
   The selected sailor's standing profile, shown under the
   picker so you can see what the personal questions will be
   written against before generating them.

   Collapsed to the first two lines; "See more" reveals the
   rest. Reads the same /api/sailor-profile route the generate
   step uses, so what is shown here is what the agent gets.
   ============================================================ */

const C = {
  sand: "#EDE7DA",
  sand2: "#E3DCCB",
  line: "#DDD5C4",
  green: "#00A651",
  ink: "#1A1A18",
  warm: "#6B6459",
  warmLt: "#8E877A",
  red: "#C4392C",
} as const;

const PREVIEW_LINES = 2;

type State =
  | { status: "loading" }
  | { status: "missing"; message: string }
  | { status: "error"; message: string }
  | { status: "ready"; content: string };

export default function SailorProfilePreview({ sailor }: { sailor: string }) {
  const [state, setState] = useState<State>({ status: "loading" });
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!sailor) return;
    let cancelled = false;

    setState({ status: "loading" });
    setExpanded(false);

    fetch(`/api/sailor-profile?sailor=${encodeURIComponent(sailor)}`)
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        if (cancelled) return;
        if (res.status === 404) {
          setState({ status: "missing", message: data?.error ?? `No profile on file for ${sailor}.` });
        } else if (!res.ok) {
          setState({ status: "error", message: data?.error ?? "Could not load the profile." });
        } else {
          setState({ status: "ready", content: data.content as string });
        }
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error", message: "Could not load the profile." });
      });

    // The sailor can change before the request lands; ignore the stale reply.
    return () => { cancelled = true; };
  }, [sailor]);

  const wrap: React.CSSProperties = {
    border: `1px solid ${C.line}`,
    borderRadius: 6,
    background: C.sand,
    padding: "10px 12px",
    display: "flex",
    flexDirection: "column",
    gap: 6,
  };

  const label = (
    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: C.warmLt }}>
      Profile · {sailor}
    </div>
  );

  if (state.status === "loading") {
    return <div style={wrap}>{label}<p style={{ margin: 0, fontSize: 12.5, color: C.warmLt }}>Loading…</p></div>;
  }

  if (state.status === "missing" || state.status === "error") {
    return (
      <div style={{ ...wrap, borderColor: state.status === "missing" ? C.line : C.red }}>
        {label}
        <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.45, color: state.status === "missing" ? C.warm : C.red }}>
          {state.message}
        </p>
      </div>
    );
  }

  // The body is markdown but renders here as plain text, so the syntax is
  // just noise — a two-line preview led by a literal "## Description".
  const clean = (l: string) =>
    l.replace(/^#{1,6}\s*/, "").replace(/\*\*/g, "").replace(/^[-*]\s+/, "• ");

  // Blank lines would burn the two-line preview, so measure by lines that
  // actually carry text.
  const lines = state.content.split("\n").filter((l) => l.trim()).map(clean);
  const preview = lines.slice(0, PREVIEW_LINES).join("\n");
  const hasMore = lines.length > PREVIEW_LINES;

  return (
    <div style={wrap}>
      {label}
      <p
        style={{
          margin: 0,
          fontSize: 12.5,
          lineHeight: 1.5,
          color: C.ink,
          whiteSpace: "pre-wrap",
          maxHeight: expanded ? 300 : undefined,
          overflowY: expanded ? "auto" : undefined,
        }}
      >
        {expanded ? lines.join("\n") : preview}
      </p>

      {hasMore && (
        <button
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          style={{
            alignSelf: "flex-start",
            padding: 0,
            border: "none",
            background: "none",
            color: C.green,
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            textDecoration: "underline",
          }}
        >
          {expanded ? "See less" : "See more"}
        </button>
      )}
    </div>
  );
}
