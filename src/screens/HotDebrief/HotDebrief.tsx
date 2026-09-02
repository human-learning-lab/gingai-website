"use client";

import React, { useEffect, useMemo, useState } from "react";
import MarkdownDocument from "@/components/MarkdownDocument";

/* ============================================================
   Ginga — Hot debrief
   A prompt, the sources it reads, and the document it makes.

   The document is one editable text field, not a set of typed
   sections. The prompt decides the shape; the coach edits the
   result. Ginga holds both the draft and his version.
   ============================================================ */

/* ---------- types ---------- */

/** One body of material the prompt can read. */
export interface DebriefSource {
  id: string;
  /** e.g. "Crew captures" */
  label: string;
  /** e.g. "10 of 10", "races 1–3" — shown so the coach sees the coverage. */
  detail: string;
  /** Selected by default. */
  enabled: boolean;
}

export interface DebriefDraft {
  /** What the model wrote. Kept even after the coach edits. */
  generated: string;
  /** The coach's version. Starts as a copy of generated. */
  edited: string;
  generatedAt: string;
  /** Which sources produced it. */
  sourceIds: string[];
  promptVersion: number;
}

export type RunState = "idle" | "running" | "done";

export interface HotDebriefProps {
  sources: DebriefSource[];
  /** Which source ids are selected. Controlled by the parent. */
  selectedSourceIds: string[];
  onSelectedSourceIdsChange: (ids: string[]) => void;

  prompt: string;
  onPromptChange: (next: string) => void;

  draft?: DebriefDraft | null;
  /** The coach edited the document. Debounce before persisting. */
  onDocumentChange: (text: string) => void;

  /**
   * Run the prompt against the selected sources.
   * Resolve with the generated text.
   */
  onRun: (args: { prompt: string; sourceIds: string[] }) => Promise<string>;

  onSaveTemplate?: () => void;
  /** File the debrief and refresh the context files it feeds. */
  onPublish?: () => Promise<void> | void;
  /** Persist the edited document. */
  onSave?: () => Promise<void> | void;
  saveState?: { dirty: boolean; saving: boolean; error?: string | null };
  /** What the last publish did, or why it could not. */
  publishState?: { busy: boolean; message?: string | null; error?: boolean };
  onResetPrompt?: () => void;
  onCopy?: () => void;
  onExport?: () => void;
}

/* ---------- tokens ---------- */

const C = {
  paper: "#F7F4ED",
  sand: "#EDE7DA",
  sand2: "#E3DCCB",
  line: "#DDD5C4",
  green: "#00A651",
  ink: "#1A1A18",
  warm: "#6B6459",
  warmLt: "#8E877A",
  field: "#FFFDF8",
} as const;

const DISPLAY =
  "'Archivo Narrow','Roboto Condensed','IBM Plex Sans Condensed',system-ui,sans-serif";
const UI = "'Inter','IBM Plex Sans',-apple-system,system-ui,sans-serif";
const MONO = "ui-monospace,'SF Mono',Menlo,monospace";

const label: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.09em",
  textTransform: "uppercase",
  color: C.warmLt,
  fontFamily: UI,
};

/* ---------- component ---------- */

export default function HotDebrief({
  sources,
  selectedSourceIds,
  onSelectedSourceIdsChange,
  prompt,
  onPromptChange,
  draft = null,
  onDocumentChange,
  onRun,
  onSaveTemplate,
  onPublish,
  onSave,
  saveState,
  publishState,
  onResetPrompt,
  onCopy,
  onExport,
}: HotDebriefProps) {
  const [state, setState] = useState<RunState>(draft ? "done" : "idle");
  const [editing, setEditing] = useState(false);

  /* A saved draft arrives after mount, so the initial state alone would leave
     the screen on "Nothing written yet" with the document loaded behind it. */
  useEffect(() => {
    if (draft) setState((s) => (s === "running" ? s : "done"));
  }, [draft]);

  const selectedCount = selectedSourceIds.length;

  const toggleSource = (id: string) =>
    onSelectedSourceIdsChange(
      selectedSourceIds.includes(id)
        ? selectedSourceIds.filter((x) => x !== id)
        : [...selectedSourceIds, id]
    );

  const run = async () => {
    if (!selectedCount) return;
    setState("running");
    try {
      await onRun({ prompt, sourceIds: selectedSourceIds });
      setState("done");
    } catch {
      setState(draft ? "done" : "idle");
    }
  };

  return (
    <div style={{ fontFamily: UI, color: C.ink }}>
      <header style={{ marginBottom: 16 }}>
        <h1 style={{ fontFamily: DISPLAY, fontSize: 22, fontWeight: 700, margin: 0 }}>
          Hot debrief
        </h1>
        <p
          style={{
            fontSize: 12.5,
            color: C.warm,
            margin: "4px 0 0",
            lineHeight: 1.55,
            maxWidth: 660,
          }}
        >
          Your prompt, the sources it reads, and the document it makes. Edit
          either and run it again.
        </p>
      </header>

      <div className="phase-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,1fr) 300px",
          gap: 16,
          alignItems: "start",
        }}
      >
        <div>
          {state === "idle" && (
            <Placeholder
              title="Nothing written yet"
              body={`${selectedCount} sources selected. Run the prompt to draft the document — then edit it here.`}
            />
          )}

          {state === "running" && (
            <Placeholder
              title={`Reading ${selectedCount} sources…`}
              body="Usually under a minute."
            />
          )}

          {state === "done" && draft && (
            <>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 11,
                }}
              >
                <h2
                  style={{
                    fontFamily: DISPLAY,
                    fontSize: 19,
                    fontWeight: 600,
                    margin: 0,
                  }}
                >
                  Hot debrief
                  <span
                    style={{
                      fontFamily: UI,
                      fontSize: 12,
                      fontWeight: 400,
                      color: C.warmLt,
                      marginLeft: 9,
                    }}
                  >
                    markdown · {editing ? "editing" : "rendered"}
                  </span>
                </h2>
                <div style={{ display: "flex", gap: 7 }}>
                  {/* The document is markdown, so it reads as markdown by
                      default. Editing is the raw text, since that is what the
                      coach is actually changing. */}
                  <button onClick={() => setEditing((v) => !v)} style={quietButton}>
                    {editing ? "Done" : "Edit"}
                  </button>
                  {onSave && (
                    /* Disabled until there is something outstanding, matching
                       the other phases. */
                    <button
                      onClick={() => void onSave()}
                      disabled={!saveState?.dirty || saveState?.saving}
                      style={{
                        ...quietButton,
                        cursor: saveState?.dirty && !saveState?.saving ? "pointer" : "not-allowed",
                        color: saveState?.dirty ? C.ink : C.warmLt,
                        fontWeight: saveState?.dirty ? 600 : 400,
                      }}
                    >
                      {saveState?.saving ? "Saving…" : saveState?.dirty ? "Save changes" : "Saved ✓"}
                    </button>
                  )}
                  {onPublish && (
                    <button
                      onClick={() => void onPublish()}
                      disabled={publishState?.busy}
                      style={{
                        ...quietButton,
                        border: "none",
                        background: publishState?.busy ? C.sand2 : C.ink,
                        color: publishState?.busy ? C.warmLt : "#fff",
                        cursor: publishState?.busy ? "not-allowed" : "pointer",
                      }}
                    >
                      {publishState?.busy ? "Filing…" : "File debrief & update files"}
                    </button>
                  )}
                  {onCopy && (
                    <button onClick={onCopy} style={quietButton}>
                      Copy
                    </button>
                  )}
                  {onExport && (
                    <button onClick={onExport} style={quietButton}>
                      Export
                    </button>
                  )}
                </div>
              </div>

              {saveState?.error && (
                <p
                  role="alert"
                  style={{
                    margin: "0 0 11px",
                    padding: "9px 12px",
                    borderRadius: 6,
                    border: "1px solid #C4392C",
                    background: "rgba(196,57,44,0.07)",
                    color: "#C4392C",
                    fontSize: 12.5,
                    lineHeight: 1.5,
                  }}
                >
                  {saveState.error}
                </p>
              )}

              {publishState?.message && (
                <p
                  role="alert"
                  style={{
                    margin: "0 0 11px",
                    padding: "9px 12px",
                    borderRadius: 6,
                    border: `1px solid ${publishState.error ? "#C4392C" : C.line}`,
                    background: publishState.error ? "rgba(196,57,44,0.07)" : C.sand,
                    color: publishState.error ? "#C4392C" : C.warm,
                    fontSize: 12.5,
                    lineHeight: 1.5,
                  }}
                >
                  {publishState.message}
                </p>
              )}

              {editing ? (
                <textarea
                  value={draft.edited}
                  onChange={(e) => onDocumentChange(e.target.value)}
                  aria-label="Debrief document"
                  style={{
                    width: "100%",
                    minHeight: 620,
                    padding: "20px 22px",
                    border: `1px solid ${C.line}`,
                    borderRadius: 9,
                    background: "#fff",
                    fontSize: 13,
                    lineHeight: 1.7,
                    color: C.ink,
                    resize: "vertical",
                    fontFamily: MONO,
                    outline: "none",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: "100%",
                    minHeight: 620,
                    padding: "20px 22px",
                    border: `1px solid ${C.line}`,
                    borderRadius: 9,
                    background: "#fff",
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                  }}
                >
                  {/* The context panels' visual language, but rendered by a
                      real markdown parser: a debrief carries nested lists,
                      tables and numbered steps that the block parser flattens. */}
                  <MarkdownDocument>{draft.edited}</MarkdownDocument>
                </div>
              )}
            </>
          )}
        </div>

        <aside className="phase-sticky"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 14,
            position: "sticky",
            top: 16,
          }}
        >
          <Card title="Prompt">
            <textarea
              value={prompt}
              onChange={(e) => onPromptChange(e.target.value)}
              aria-label="Debrief prompt"
              style={{
                width: "100%",
                minHeight: 320,
                padding: "11px 12px",
                border: `1px solid ${C.line}`,
                borderRadius: 7,
                background: C.field,
                fontSize: 11.5,
                lineHeight: 1.6,
                color: C.ink,
                resize: "vertical",
                fontFamily: MONO,
                outline: "none",
              }}
            />
            {(onSaveTemplate || onResetPrompt) && (
              <div style={{ display: "flex", gap: 8, marginTop: 9 }}>
                {onSaveTemplate && (
                  <button onClick={onSaveTemplate} style={quietButton}>
                    Save as template
                  </button>
                )}
                {onResetPrompt && (
                  <button onClick={onResetPrompt} style={quietButton}>
                    Reset
                  </button>
                )}
              </div>
            )}
          </Card>

          <Card title="Sources">
            {sources.map((source) => (
              <SourceRow
                key={source.id}
                source={source}
                checked={selectedSourceIds.includes(source.id)}
                onToggle={() => toggleSource(source.id)}
              />
            ))}
          </Card>

          <button
            onClick={run}
            disabled={state === "running" || !selectedCount}
            style={{
              width: "100%",
              padding: "12px 0",
              borderRadius: 8,
              border: "none",
              cursor:
                state === "running" || !selectedCount ? "not-allowed" : "pointer",
              background:
                state === "running" || !selectedCount ? C.sand2 : C.green,
              color: state === "running" || !selectedCount ? C.warmLt : "#fff",
              fontSize: 13.5,
              fontWeight: 600,
              fontFamily: UI,
            }}
          >
            {state === "running"
              ? "Writing…"
              : draft
              ? "Run again"
              : "Write the debrief"}
          </button>

          {draft && (
            <p
              style={{
                fontSize: 11.5,
                color: C.warmLt,
                lineHeight: 1.5,
                margin: 0,
              }}
            >
              Running again replaces the draft. Your edits are kept as a separate
              version.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}

/* ---------- sub-components ---------- */

function SourceRow({
  source,
  checked,
  onToggle,
}: {
  source: DebriefSource;
  checked: boolean;
  onToggle: () => void;
}) {
  const id = `source-${source.id}`;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 9,
        padding: "7px 0",
        borderBottom: `1px solid ${C.line}`,
      }}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        style={{ width: 15, height: 15, accentColor: C.green, cursor: "pointer" }}
      />
      <label htmlFor={id} style={{ flex: 1, fontSize: 12.5, cursor: "pointer" }}>
        {source.label}
      </label>
      <span style={{ ...label, fontSize: 10 }}>{source.detail}</span>
    </div>
  );
}

function Placeholder({ title, body }: { title: string; body: string }) {
  return (
    <div
      style={{
        background: C.field,
        border: `1px solid ${C.line}`,
        borderRadius: 9,
        padding: "70px 24px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontFamily: DISPLAY,
          fontSize: 20,
          fontWeight: 600,
          marginBottom: 8,
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontSize: 13,
          color: C.warm,
          lineHeight: 1.6,
          maxWidth: 380,
          margin: "0 auto",
        }}
      >
        {body}
      </div>
    </div>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{
        background: C.field,
        border: `1px solid ${C.line}`,
        borderRadius: 9,
        padding: 15,
      }}
    >
      <h2 style={{ ...label, margin: "0 0 11px" }}>{title}</h2>
      {children}
    </section>
  );
}

/* ---------- shared styles ---------- */

const quietButton: React.CSSProperties = {
  padding: "7px 11px",
  borderRadius: 6,
  cursor: "pointer",
  background: "transparent",
  border: `1px solid ${C.line}`,
  color: C.warm,
  fontSize: 12,
  fontFamily: UI,
};
