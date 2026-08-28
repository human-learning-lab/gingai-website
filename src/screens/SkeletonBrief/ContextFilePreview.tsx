"use client";

import { useEffect, useState } from "react";

/* ============================================================
   A context file, shown above the questions so you can see what
   they will be written against before generating them.

   Used for both scopes: the selected sailor's file in personal,
   the squad's in team. It reads the same routes the generate
   step uses, so what is on screen is what the agent gets — if
   this panel says the file is missing, generation will fail for
   the same reason.

   Collapsed until two blocks carry text; "See more" reveals the
   rest.
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

export default function ContextFilePreview({
  label,
  endpoint,
}: {
  /** Shown as the panel's eyebrow — e.g. "Profile · Martine" or "Team context". */
  label: string;
  /** Route returning { content }, 404 when no file exists yet. */
  endpoint: string;
}) {
  const [state, setState] = useState<State>({ status: "loading" });
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    setState({ status: "loading" });
    setExpanded(false);

    fetch(endpoint)
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        if (cancelled) return;
        if (res.status === 404) {
          setState({ status: "missing", message: data?.error ?? "No context file yet." });
        } else if (!res.ok) {
          setState({ status: "error", message: data?.error ?? "Could not load the context file." });
        } else {
          setState({ status: "ready", content: data.content as string });
        }
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error", message: "Could not load the context file." });
      });

    // The endpoint can change before the request lands; ignore the stale reply.
    return () => { cancelled = true; };
  }, [endpoint]);

  const wrap: React.CSSProperties = {
    border: `1px solid ${C.line}`,
    borderRadius: 6,
    background: C.sand,
    padding: "10px 12px",
    display: "flex",
    flexDirection: "column",
    gap: 6,
  };

  const eyebrow = (
    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: C.warmLt }}>
      {label}
    </div>
  );

  if (state.status === "loading") {
    return <div style={wrap}>{eyebrow}<p style={{ margin: 0, fontSize: 12.5, color: C.warmLt }}>Loading…</p></div>;
  }

  if (state.status === "missing" || state.status === "error") {
    return (
      <div style={{ ...wrap, borderColor: state.status === "missing" ? C.line : C.red }}>
        {eyebrow}
        <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.45, color: state.status === "missing" ? C.warm : C.red }}>
          {state.message}
        </p>
      </div>
    );
  }

  const blocks = parse(state.content);
  /* Take blocks until two carry actual text. The file opens with a layer
     heading and a section heading, so a flat slice of two would preview
     nothing but headings. */
  const cut = (() => {
    let content = 0;
    for (let i = 0; i < blocks.length; i++) {
      if (blocks[i].kind !== "heading") content++;
      if (content === PREVIEW_LINES) return i + 1;
    }
    return blocks.length;
  })();
  const shown = expanded ? blocks : blocks.slice(0, cut);
  const hasMore = blocks.length > cut;

  return (
    <div style={wrap}>
      {eyebrow}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 2,
          maxHeight: expanded ? 300 : undefined,
          overflowY: expanded ? "auto" : undefined,
        }}
      >
        {shown.map((b, i) =>
          b.kind === "heading" ? (
            <h4
              key={i}
              style={{
                margin: i === 0 ? 0 : (b.level === 1 ? "14px 0 2px" : "10px 0 2px"),
                fontSize: b.level === 1 ? 11.5 : 10.5,
                fontWeight: 700,
                letterSpacing: "0.09em",
                textTransform: "uppercase",
                color: b.level === 1 ? C.ink : C.green,
                borderBottom: b.level === 1 ? `1px solid ${C.line}` : undefined,
                paddingBottom: b.level === 1 ? 3 : undefined,
              }}
            >
              {b.text}
            </h4>
          ) : b.kind === "bullet" ? (
            <p
              key={i}
              style={{
                margin: "3px 0 0",
                paddingLeft: 12,
                fontSize: 12.5,
                lineHeight: 1.5,
                color: C.ink,
                textIndent: -12,
              }}
            >
              <span style={{ color: C.warmLt }}>•&nbsp;</span>
              {b.lead && <strong style={{ fontWeight: 600 }}>{b.lead}: </strong>}
              {b.text}
            </p>
          ) : (
            <p
              key={i}
              style={{ margin: "3px 0 0", fontSize: 12.5, lineHeight: 1.55, color: C.ink }}
            >
              {b.text}
            </p>
          ),
        )}
      </div>

      {hasMore && (
        <button
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          style={{
            alignSelf: "flex-start",
            marginTop: 2,
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

interface Block {
  kind: "heading" | "bullet" | "text";
  text: string;
  /** Heading depth — the context file uses H1 for layers, H2 for sections. */
  level?: number;
  /** The bold lead-in on a bullet, e.g. "Maneuver Consistency". */
  lead?: string;
}

/**
 * The profile is markdown but renders here as styled elements rather than
 * raw text, so the syntax is parsed away instead of being shown.
 * Blank lines are dropped — otherwise a two-block preview spends one on
 * whitespace.
 */
function parse(md: string): Block[] {
  return md
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map<Block>((line) => {
      const h = line.match(/^(#{1,6})\s/);
      if (h) {
        return {
          kind: "heading",
          level: h[1].length,
          text: line.replace(/^#{1,6}\s*/, "").replace(/\*\*/g, ""),
        };
      }
      if (/^[-*]\s/.test(line)) {
        const body = line.replace(/^[-*]\s+/, "");
        // Bullets are written as "**Label:** detail" — keep the label as an
        // actual lead-in rather than flattening it into the sentence.
        const m = body.match(/^\*\*(.+?):?\*\*:?\s*(.*)$/);
        return m
          ? { kind: "bullet", lead: m[1], text: m[2] }
          : { kind: "bullet", text: body.replace(/\*\*/g, "") };
      }
      return { kind: "text", text: line.replace(/\*\*/g, "") };
    });
}
