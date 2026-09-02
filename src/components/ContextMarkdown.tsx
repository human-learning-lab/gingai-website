"use client";

/* ============================================================
   How a context file reads on screen.

   The documents are markdown but render as typed blocks rather
   than raw text or a generic markdown pass: two heading levels
   with different weight, bullets whose bold lead-in stays a
   lead-in, and paragraphs. Extracted from the preview panel so
   the debrief renders the same way — one look for every file
   the system writes.
   ============================================================ */

const C = {
  sand: "#EDE7DA",
  line: "#DDD5C4",
  green: "#00A651",
  ink: "#1A1A18",
  warmLt: "#8E877A",
} as const;

export interface Block {
  kind: "heading" | "bullet" | "text";
  text: string;
  /** Heading depth — the context files use H1 for layers, H2 for sections. */
  level?: number;
  /** The bold lead-in on a bullet, e.g. "Maneuver Consistency". */
  lead?: string;
}

/**
 * Parses the markdown away rather than showing it.
 *
 * Blank lines are dropped: a preview that counts blocks should not spend one
 * on whitespace, and the gaps come from the block spacing instead.
 */
export function parseBlocks(md: string): Block[] {
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

export default function ContextMarkdown({
  blocks,
  /** Larger for a full document, smaller inside a preview panel. */
  scale = 1,
}: {
  blocks: Block[];
  scale?: number;
}) {
  const px = (n: number) => n * scale;

  return (
    <>
      {blocks.map((b, i) =>
        b.kind === "heading" ? (
          <h4
            key={i}
            style={{
              margin: i === 0 ? 0 : b.level === 1 ? `${px(14)}px 0 2px` : `${px(10)}px 0 2px`,
              fontSize: b.level === 1 ? px(11.5) : px(10.5),
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
              margin: `${px(3)}px 0 0`,
              paddingLeft: px(12),
              fontSize: px(12.5),
              lineHeight: 1.5,
              color: C.ink,
              textIndent: px(-12),
            }}
          >
            <span style={{ color: C.warmLt }}>•&nbsp;</span>
            {b.lead && <strong style={{ fontWeight: 600 }}>{b.lead}: </strong>}
            {b.text}
          </p>
        ) : (
          <p
            key={i}
            style={{ margin: `${px(3)}px 0 0`, fontSize: px(12.5), lineHeight: 1.55, color: C.ink }}
          >
            {b.text}
          </p>
        ),
      )}
    </>
  );
}
