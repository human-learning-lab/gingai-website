"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/* ============================================================
   A full markdown document, in the context files' visual
   language.

   The context panels parse a known shape — two heading levels,
   bullets, paragraphs — and that is all those files contain.
   A debrief is whatever the agent writes: nested lists, tables,
   numbered steps, italic labels. Parsing that by hand means
   reimplementing markdown badly, so this renders it properly and
   styles the result instead.
   ============================================================ */

const C = {
  sand: "#EDE7DA",
  sand2: "#E3DCCB",
  line: "#DDD5C4",
  green: "#00A651",
  ink: "#1A1A18",
  warm: "#6B6459",
  warmLt: "#8E877A",
} as const;

const UI = "ui-sans-serif,system-ui,-apple-system,sans-serif";

export default function MarkdownDocument({ children }: { children: string }) {
  return (
    <div className="md-doc" style={{ fontFamily: UI, fontSize: 13.5, lineHeight: 1.7, color: C.ink }}>
      {/* Markers are CSS, not components. Detecting ordered items from the
          props react-markdown passes is unreliable, and getting it wrong puts
          a bullet and a number on the same line. ::marker also cannot be set
          from an inline style. */}
      <style>{`
        .md-doc ul { list-style: disc; }
        .md-doc ol { list-style: decimal; }
        .md-doc li::marker { color: ${C.warmLt}; }
        .md-doc ul ul { list-style: circle; }
      `}</style>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1
              style={{
                margin: "26px 0 10px",
                paddingBottom: 5,
                borderBottom: `1px solid ${C.line}`,
                fontSize: 12.5,
                fontWeight: 700,
                letterSpacing: "0.09em",
                textTransform: "uppercase",
                color: C.ink,
              }}
            >
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2
              style={{
                margin: "20px 0 7px",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.09em",
                textTransform: "uppercase",
                color: C.green,
              }}
            >
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 style={{ margin: "15px 0 5px", fontSize: 13, fontWeight: 600, color: C.ink }}>
              {children}
            </h3>
          ),
          /* A list item's own paragraph should not open a gap inside the item. */
          p: ({ children }) => <p style={{ margin: "7px 0 0" }}>{children}</p>,
          /* Bullets keep the hanging indent and the muted marker the context
             panels use, and nesting is real rather than flattened. */
          ul: ({ children }) => <ul style={{ margin: "6px 0 0", paddingLeft: 20 }}>{children}</ul>,
          ol: ({ children }) => <ol style={{ margin: "6px 0 0", paddingLeft: 22 }}>{children}</ol>,
          li: ({ children }) => <li style={{ margin: "4px 0 0" }}>{children}</li>,
          strong: ({ children }) => <strong style={{ fontWeight: 600 }}>{children}</strong>,
          em: ({ children }) => <em style={{ color: C.warm, fontStyle: "normal", fontWeight: 600 }}>{children}</em>,
          blockquote: ({ children }) => (
            <blockquote
              style={{
                margin: "9px 0 0",
                padding: "9px 12px",
                background: C.sand,
                borderRadius: 6,
                color: C.warm,
              }}
            >
              {children}
            </blockquote>
          ),
          /* Wide tables scroll inside their own box rather than pushing the
             document sideways. */
          table: ({ children }) => (
            <div style={{ overflowX: "auto", margin: "10px 0 0" }}>
              <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 12.5 }}>
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th
              style={{
                textAlign: "left",
                padding: "7px 10px",
                background: C.sand,
                borderBottom: `1px solid ${C.line}`,
                fontSize: 10.5,
                fontWeight: 700,
                letterSpacing: "0.07em",
                textTransform: "uppercase",
                color: C.warm,
              }}
            >
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td style={{ padding: "8px 10px", borderBottom: `1px solid ${C.line}`, verticalAlign: "top" }}>
              {children}
            </td>
          ),
          hr: () => <hr style={{ border: "none", borderTop: `1px solid ${C.line}`, margin: "18px 0" }} />,
          code: ({ children }) => (
            <code
              style={{
                background: C.sand2,
                borderRadius: 3,
                padding: "1px 4px",
                fontSize: "0.9em",
                fontFamily: "ui-monospace,'SF Mono',Menlo,monospace",
              }}
            >
              {children}
            </code>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
