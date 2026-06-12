'use client';

import { useState, useRef, useEffect } from 'react';
import type { ReactNode } from 'react';
import { SIM_DOCS, DOC_CONTENT, SimDataUpload, VIKTOR_BASE, VIKTOR_HEADERS } from '@/screens/DayBackbone/BlockContent';
import type { SimDoc } from '@/screens/DayBackbone/BlockContent';
import { useTranscript } from '@/hooks/useTranscript';
import { useUser } from '@clerk/nextjs';
import { useRole } from '@/context/RoleContext';

// ── Week config ────────────────────────────────────────────────

const CURRENT_WEEK = 24;

const WEEK_META: Record<number, { sublabel: string }> = {
  23: { sublabel: 'Pre-Halifax' },
  24: { sublabel: 'Onboarding' },
};

// ── Day config ─────────────────────────────────────────────────

const DAYS = [
  { id: 'mon'     as const, label: 'Objectives'   },
  { id: 'tue'     as const, label: 'Practice'     },
  { id: 'thu'     as const, label: 'Main Session' },
  { id: 'debrief' as const, label: 'Report'       },
];
type DayId = 'mon' | 'tue' | 'thu' | 'debrief';

// Synthetic doc representing the session objectives — always first in Objectives tab
const OBJECTIVES_DOC: SimDoc = {
  title:    'Session Objectives',
  subtitle: 'Fri 12 Jun · T2 timing & positioning',
  type:     'pdf',
};

// Week 24 has real documents; other weeks start empty
function getDocsByDay(weekNum: number): Record<string, SimDoc[]> {
  if (weekNum === CURRENT_WEEK) return {
    mon: [OBJECTIVES_DOC, ...SIM_DOCS.filter(d => d.date?.startsWith('Mon'))],
    tue: SIM_DOCS.filter(d => d.date?.startsWith('Tue')),
    thu: SIM_DOCS.filter(d => d.date?.startsWith('Fri')),
  };
  return { mon: [OBJECTIVES_DOC], tue: [], thu: [] };
}


// ── File browser ──────────────────────────────────────────────

function FileBrowser({
  docs,
  selected,
  onSelect,
}: {
  docs: SimDoc[];
  selected: SimDoc | null;
  onSelect: (d: SimDoc) => void;
}) {
  if (docs.length === 0) {
    return (
      <div style={{ padding: '16px 12px', color: 'var(--text4)', fontSize: 12 }}>
        No documents added yet.
      </div>
    );
  }
  return (
    <div>
      <div style={{ fontSize: 9, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text4)', padding: '4px 8px 6px' }}>
        Session Documents
      </div>
      {docs.map((doc, i) => {
        const active = selected?.title === doc.title;
        const isGdoc  = doc.type === 'gdoc';
        const isVideo = doc.type === 'video';
        return (
          <button
            key={i}
            onClick={() => onSelect(doc)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '7px 8px', background: active ? 'color-mix(in srgb, var(--sim) 12%, var(--bg))' : 'transparent', border: 'none', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', marginBottom: 1 }}
          >
            {isVideo ? (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={active ? 'var(--sim)' : '#e8574a'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
              </svg>
            ) : isGdoc ? (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#4285f4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
            ) : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={active ? 'var(--sim)' : 'var(--text4)'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
            )}
            <span style={{ fontSize: 12, lineHeight: 1.3, flex: 1, minWidth: 0, fontWeight: active ? 600 : 400, color: active ? 'var(--text)' : 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {doc.title}
            </span>
            {isGdoc  && <span style={{ fontSize: 8, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: '0.08em', color: '#4285f4', flexShrink: 0 }}>LIVE</span>}
            {isVideo && <span style={{ fontSize: 8, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: '0.08em', color: '#e8574a', flexShrink: 0 }}>VIDEO</span>}
          </button>
        );
      })}
    </div>
  );
}

// ── Doc header ────────────────────────────────────────────────

function DocHeader({ doc }: { doc: SimDoc }) {
  return (
    <div style={{ padding: '14px 20px 12px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.title}</div>
        <div style={{ fontSize: 10, color: 'var(--text4)', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: '0.06em', marginTop: 1 }}>{doc.subtitle}</div>
      </div>
      {doc.externalHref && (
        <a href={doc.externalHref} target="_blank" rel="noopener noreferrer"
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 6, border: '1px solid var(--line)', background: 'var(--bg3)', color: 'var(--text4)', textDecoration: 'none', fontSize: 11, fontWeight: 600, flexShrink: 0 }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          Open
        </a>
      )}
    </div>
  );
}

// ── Doc content ───────────────────────────────────────────────

function DocContent({ doc }: { doc: SimDoc }) {
  if (doc.type === 'video' && doc.embedSrc) {
    return (
      <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
        <iframe
          src={doc.embedSrc}
          allow="autoplay"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
          title={doc.title}
        />
      </div>
    );
  }
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px 40px' }}>
      {DOC_CONTENT[doc.title]}
    </div>
  );
}

// ── Left panel headers ─────────────────────────────────────────

function MonObjectivesHeader() {
  return (
    <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
      <div style={{ fontSize: 9, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--sim)', marginBottom: 8 }}>
        Fri 12 Jun · Session Objectives
      </div>
      <div style={{ background: 'color-mix(in srgb, var(--sim) 8%, var(--bg))', border: '1px solid var(--sb)', borderRadius: 8, padding: '10px 12px', marginBottom: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', lineHeight: 1.45, marginBottom: 4 }}>
          Evaluate T2 timing &amp; positioning
        </div>
        <div style={{ fontSize: 10, color: 'var(--text3)', lineHeight: 1.5 }}>
          Using courses 150° and 345° TWD — focus on M1 position and early gybe on northerly course.
        </div>
      </div>
      <div style={{ fontSize: 9, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text4)', marginBottom: 6 }}>
        What we're looking for
      </div>
      {OBSERVATIONS.map((obs, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 5 }}>
          <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'var(--sg)', border: '1px solid var(--sb)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
            <span style={{ fontSize: 8, fontWeight: 800, color: 'var(--sim)', fontFamily: "'Barlow Condensed', sans-serif" }}>{i + 1}</span>
          </div>
          <div style={{ fontSize: 10, color: 'var(--text2)', lineHeight: 1.5 }}>{obs}</div>
        </div>
      ))}
    </div>
  );
}

function DayPanelHeader({ tag, desc }: { tag: string; desc: string }) {
  return (
    <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
      <div style={{ fontSize: 9, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--sim)', marginBottom: 6 }}>
        {tag}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.55 }}>{desc}</div>
    </div>
  );
}

// ── Objectives doc content (fetched from Viktor's server) ──────

type WeekObjectives = {
  main_objective: string;
  description:    string;
  observations:   string[];
};

// Hardcoded defaults for weeks that have objectives but no server data yet
const WEEK_DEFAULTS: Record<number, WeekObjectives> = {
  24: {
    main_objective: 'Evaluate T2 timing & positioning',
    description: 'Use the two courses shared by Mel (150° and 345° TWD) to evaluate T2 timing and positioning. Focus on M1 position and ability to get early gybe in northerly course.',
    observations: [
      'What TTK/ratio was best for optimal final kill before trigger pull?',
      'What positioning at T2 was good — north/south, first/last in train?',
      'What positioning at T2 was bad — north/south, first/last in train?',
      'From the 2024 video: can we relate observations we see in the Sim, or do we need to calibrate numbers/positioning?',
    ],
  },
};

function ObjectivesContent({ weekNum }: { weekNum: number }) {
  const [data,    setData]    = useState<WeekObjectives | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [draft,   setDraft]   = useState<WeekObjectives>({ main_objective: '', description: '', observations: [''] });

  useEffect(() => {
    setLoading(true);
    setEditing(false);
    fetch(`${VIKTOR_BASE}/objectives/${weekNum}`, { headers: VIKTOR_HEADERS })
      .then(r => r.ok ? r.json() : null)
      .then(d => { setData(d ?? WEEK_DEFAULTS[weekNum] ?? null); setLoading(false); })
      .catch(() => { setData(WEEK_DEFAULTS[weekNum] ?? null); setLoading(false); });
  }, [weekNum]);

  function startEdit() {
    setDraft(data ?? { main_objective: '', description: '', observations: [''] });
    setEditing(true);
  }

  function setObs(i: number, val: string) {
    setDraft(d => ({ ...d, observations: d.observations.map((o, j) => j === i ? val : o) }));
  }
  function addObs()    { setDraft(d => ({ ...d, observations: [...d.observations, ''] })); }
  function removeObs(i: number) { setDraft(d => ({ ...d, observations: d.observations.filter((_, j) => j !== i) })); }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`${VIKTOR_BASE}/objectives/${weekNum}`, {
        method: 'POST', headers: VIKTOR_HEADERS,
        body: JSON.stringify({ ...draft, observations: draft.observations.filter(o => o.trim()) }),
      });
      if (res.ok) { setData(await res.json()); setEditing(false); }
    } finally { setSaving(false); }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', fontFamily: 'inherit', fontSize: 13, lineHeight: 1.5,
    background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 7,
    padding: '8px 10px', color: 'var(--text)', outline: 'none', boxSizing: 'border-box',
  };

  if (loading) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text4)', fontSize: 13 }}>
      Loading…
    </div>
  );

  // ── Edit mode ──────────────────────────────────────────────
  if (editing) return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px 40px' }}>
      <div style={{ fontSize: 10, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text4)', marginBottom: 6 }}>
        Main Objective
      </div>
      <input
        value={draft.main_objective}
        onChange={e => setDraft(d => ({ ...d, main_objective: e.target.value }))}
        placeholder="e.g. Evaluate T2 timing & positioning"
        style={{ ...inputStyle, marginBottom: 12, fontWeight: 600 }}
      />
      <div style={{ fontSize: 10, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text4)', marginBottom: 6 }}>
        Description
      </div>
      <textarea
        value={draft.description}
        onChange={e => setDraft(d => ({ ...d, description: e.target.value }))}
        placeholder="Context, courses, conditions…"
        rows={3}
        style={{ ...inputStyle, resize: 'vertical', marginBottom: 16 }}
      />
      <div style={{ fontSize: 10, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text4)', marginBottom: 8 }}>
        What we&apos;re looking for
      </div>
      {draft.observations.map((obs, i) => (
        <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'center' }}>
          <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--bg3)', border: '1px solid var(--line)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 8, fontWeight: 800, color: 'var(--text4)', fontFamily: "'Barlow Condensed', sans-serif" }}>{i + 1}</span>
          </div>
          <input value={obs} onChange={e => setObs(i, e.target.value)} placeholder={`Observation ${i + 1}`} style={{ ...inputStyle, flex: 1 }} />
          <button onClick={() => removeObs(i)} style={{ flexShrink: 0, width: 24, height: 24, borderRadius: '50%', border: '1px solid var(--line)', background: 'none', cursor: 'pointer', color: 'var(--text4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, lineHeight: 1 }}>×</button>
        </div>
      ))}
      <button onClick={addObs} style={{ fontSize: 12, color: 'var(--sim)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', marginBottom: 24, fontFamily: 'inherit' }}>
        + Add observation
      </button>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => setEditing(false)} style={{ padding: '8px 16px', borderRadius: 7, border: '1px solid var(--line)', background: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, color: 'var(--text3)' }}>
          Cancel
        </button>
        <button onClick={save} disabled={saving} style={{ padding: '8px 20px', borderRadius: 7, border: 'none', background: 'var(--sim)', color: '#fff', cursor: saving ? 'default' : 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, opacity: saving ? 0.6 : 1 }}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );

  // ── Empty state ────────────────────────────────────────────
  if (!data) return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
      <div style={{ fontSize: 13, color: 'var(--text4)' }}>No objectives set for Week {weekNum} yet.</div>
      <button onClick={startEdit} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 8, border: '1px solid var(--sb)', background: 'var(--sg)', color: 'var(--sim)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 700 }}>
        + Set objectives
      </button>
    </div>
  );

  // ── View mode ──────────────────────────────────────────────
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px 40px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
        <div style={{ background: 'color-mix(in srgb, var(--sim) 8%, var(--bg))', border: '1px solid var(--sb)', borderRadius: 10, padding: '14px 16px', flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', lineHeight: 1.45, marginBottom: data.description ? 6 : 0 }}>
            {data.main_objective}
          </div>
          {data.description && (
            <div style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.6 }}>{data.description}</div>
          )}
        </div>
        <button onClick={startEdit} style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 7, border: '1px solid var(--line)', background: 'var(--bg3)', color: 'var(--text3)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12 }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          Edit
        </button>
      </div>
      {data.observations.length > 0 && (
        <>
          <div style={{ fontSize: 10, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text4)', marginBottom: 10 }}>
            What we&apos;re looking for
          </div>
          {data.observations.map((obs, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--sg)', border: '1px solid var(--sb)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
                <span style={{ fontSize: 9, fontWeight: 800, color: 'var(--sim)', fontFamily: "'Barlow Condensed', sans-serif" }}>{i + 1}</span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>{obs}</div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ── Generic day panel (split desktop / list-to-doc mobile) ─────

function DayPanel({ docs, leftHeader, renderContent }: {
  docs: SimDoc[];
  leftHeader: ReactNode;
  renderContent?: (doc: SimDoc) => ReactNode | null;
}) {
  const [uploaded, setUploaded]     = useState<SimDoc[]>([]);
  const uploadRef                   = useRef<HTMLInputElement>(null);
  const allDocs                     = [...docs, ...uploaded];

  const [selected, setSelected] = useState<SimDoc | null>(docs[0] ?? null);
  const [mobileDocOpen, setMobileDocOpen] = useState(false);

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url  = URL.createObjectURL(file);
    const ext  = file.name.split('.').pop()?.toLowerCase() ?? '';
    const isVideo = ['mp4', 'mov', 'webm', 'avi'].includes(ext);
    const newDoc: SimDoc = {
      title:        file.name,
      subtitle:     'Uploaded · ' + new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
      type:         isVideo ? 'video' : 'pdf',
      externalHref: url,
      embedSrc:     isVideo ? url : undefined,
    };
    setUploaded(prev => [...prev, newDoc]);
    setSelected(newDoc);
    e.target.value = '';
  }

  const currentIdx = selected ? allDocs.findIndex(d => d.title === selected.title) : -1;
  const prevDoc = currentIdx > 0 ? allDocs[currentIdx - 1] : null;
  const nextDoc = currentIdx < allDocs.length - 1 ? allDocs[currentIdx + 1] : null;

  function selectDoc(doc: SimDoc) {
    setSelected(doc);
    setMobileDocOpen(true);
  }

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

      {/* ── Desktop split (display:contents makes panels direct flex children) ── */}
      <div className="desk-only">
        {/* Left */}
        <div style={{ width: 260, flexShrink: 0, display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--line)', overflow: 'hidden' }}>
          {leftHeader}
          <div style={{ flex: 1, overflowY: 'auto', padding: '10px 6px' }}>
            <FileBrowser docs={allDocs} selected={selected} onSelect={setSelected} />
          </div>
          {/* Upload button */}
          <div style={{ padding: '8px 10px', borderTop: '1px solid var(--line)', flexShrink: 0 }}>
            <input ref={uploadRef} type="file" style={{ display: 'none' }} onChange={handleUpload} />
            <button onClick={() => uploadRef.current?.click()}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '7px 0', borderRadius: 7, border: '1px dashed var(--line)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, color: 'var(--text4)' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              Upload document
            </button>
          </div>
        </div>
        {/* Right */}
        {selected ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0, minHeight: 0 }}>
            <DocHeader doc={selected} />
            {renderContent?.(selected) ?? <DocContent doc={selected} />}
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: 'var(--text4)', fontSize: 13 }}>No documents for this session yet</span>
          </div>
        )}
      </div>

      {/* ── Mobile: list → full-screen doc ── */}
      <div className="mob-only" style={{ flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
        {mobileDocOpen && selected ? (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
              <button onClick={() => setMobileDocOpen(false)}
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 6, border: '1px solid var(--line)', background: 'transparent', cursor: 'pointer', fontSize: 12, color: 'var(--text3)', fontFamily: 'inherit', flexShrink: 0 }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
                Documents
              </button>
              <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selected.title}</span>
              {selected.externalHref && (
                <a href={selected.externalHref} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 6, border: '1px solid var(--line)', background: 'transparent', color: 'var(--text4)', textDecoration: 'none', fontSize: 11, flexShrink: 0 }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                  Open
                </a>
              )}
            </div>
            {renderContent?.(selected) ?? <DocContent doc={selected} />}
            {selected.type !== 'video' && (prevDoc || nextDoc) && (
              <div style={{ display: 'flex', gap: 8, padding: '12px 16px', borderTop: '1px solid var(--line)', flexShrink: 0 }}>
                {prevDoc ? (
                  <button onClick={() => setSelected(prevDoc)}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'var(--bg3)', border: '1px solid var(--line)', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 9, color: 'var(--text4)', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Previous</div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{prevDoc.title}</div>
                    </div>
                  </button>
                ) : <div style={{ flex: 1 }} />}
                {nextDoc ? (
                  <button onClick={() => setSelected(nextDoc)}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'var(--bg3)', border: '1px solid var(--line)', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', justifyContent: 'flex-end' }}>
                    <div style={{ flex: 1, minWidth: 0, textAlign: 'right' }}>
                      <div style={{ fontSize: 9, color: 'var(--text4)', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Next</div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nextDoc.title}</div>
                    </div>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
                  </button>
                ) : <div style={{ flex: 1 }} />}
              </div>
            )}
          </div>
        ) : (
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {leftHeader}
            <div style={{ padding: '10px 10px' }}>
              <FileBrowser docs={allDocs} selected={selected} onSelect={selectDoc} />
              <input ref={uploadRef} type="file" style={{ display: 'none' }} onChange={handleUpload} />
              <button onClick={() => uploadRef.current?.click()}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 0', marginTop: 8, borderRadius: 8, border: '1px dashed var(--line)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, color: 'var(--text4)' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                Upload document
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Report (per-question voice capture) ───────────────────────

const REPORT_PROMPTS = [
  'What was your clearest observation from today — one thing that happened more than once?',
  'Did the sim behaviour match the real boat? Where did it feel different?',
  'What would you do differently in the next session based on today?',
  'One hypothesis: "If we change X, then Y will improve, because Z."',
];

function SimReport() {
  const { user } = useUser();
  const { role } = useRole();
  const isSailor = role?.view === 'sailor';
  const userName = isSailor ? (user?.firstName ?? user?.username ?? undefined) : undefined;
  const { lines, connect, disconnect, reset } = useTranscript();
  const [answers, setAnswers] = useState<(string | null)[]>(REPORT_PROMPTS.map(() => null));
  const [recording, setRecording] = useState<number | null>(null);
  const [recTime, setRecTime] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Stop recording and clean up on unmount
  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    disconnect();
  }, [disconnect]);

  function startRec(idx: number) {
    reset();
    setRecording(idx);
    setRecTime(0);
    timerRef.current = setInterval(() => setRecTime(t => t + 1), 1000);
    connect();
  }

  function stopRec(idx: number) {
    if (timerRef.current) clearInterval(timerRef.current);
    disconnect();
    const text = lines.join(' ').trim();
    if (text) setAnswers(prev => prev.map((a, i) => i === idx ? text : a));
    setRecording(null);
    setRecTime(0);
  }

  const mm = String(Math.floor(recTime / 60)).padStart(2, '0');
  const ss = String(recTime % 60).padStart(2, '0');

  return (
    <div style={{ overflowY: 'auto', width: '100%', padding: '24px 24px 48px' }}>
      <div style={{ maxWidth: 660, margin: '0 auto' }}>
        <div style={{ fontSize: 9, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--sim)', marginBottom: 4 }}>
          Report · Fri 12 Jun
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginBottom: 20 }}>
          Session Reflection
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {REPORT_PROMPTS.map((prompt, i) => {
            const isRec  = recording === i;
            const isLocked = recording !== null && !isRec;
            const answer = answers[i];
            const liveText = isRec ? lines.join(' ') : null;

            return (
              <div key={i} style={{
                background: isRec ? 'color-mix(in srgb, var(--sim) 6%, var(--bg2))' : 'var(--bg2)',
                border: `1px solid ${isRec ? 'var(--sb)' : 'var(--line)'}`,
                borderRadius: 10,
                padding: '14px 16px',
                transition: 'border-color 0.15s, background 0.15s',
              }}>
                {/* Question row */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: isRec ? 'var(--sg)' : 'var(--bg3)', border: `1px solid ${isRec ? 'var(--sb)' : 'var(--line)'}`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
                    <span style={{ fontSize: 8, fontWeight: 800, color: isRec ? 'var(--sim)' : 'var(--text4)', fontFamily: "'Barlow Condensed', sans-serif" }}>{i + 1}</span>
                  </div>
                  <div style={{ flex: 1, fontSize: 13, color: 'var(--text)', lineHeight: 1.55, fontWeight: 500 }}>{prompt}</div>

                  {/* Record / Stop button */}
                  {isRec ? (
                    <button onClick={() => stopRec(i)}
                      style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 20, border: '1px solid var(--rb)', background: 'var(--rg)', color: 'var(--red)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 11, fontWeight: 700 }}>
                      <svg width="8" height="8" viewBox="0 0 10 10" fill="currentColor"><rect width="10" height="10" rx="2"/></svg>
                      {mm}:{ss}
                    </button>
                  ) : (
                    <button onClick={() => startRec(i)} disabled={isLocked}
                      style={{ flexShrink: 0, width: 30, height: 30, borderRadius: '50%', border: '1px solid var(--line)', background: 'var(--bg3)', color: isLocked ? 'var(--text4)' : answer ? 'var(--text3)' : 'var(--sim)', cursor: isLocked ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: isLocked ? 0.35 : 1, transition: 'opacity 0.15s' }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                        <line x1="12" y1="19" x2="12" y2="23"/>
                        <line x1="8" y1="23" x2="16" y2="23"/>
                      </svg>
                    </button>
                  )}
                </div>

                {/* Live transcript while recording */}
                {isRec && (
                  <div style={{ marginTop: 10, marginLeft: 32, fontSize: 13, color: liveText ? 'var(--text2)' : 'var(--text4)', lineHeight: 1.65, minHeight: 20, fontStyle: liveText ? 'normal' : 'italic' }}>
                    {liveText || 'Listening…'}
                  </div>
                )}

                {/* Saved answer */}
                {!isRec && answer && (
                  <div style={{ marginTop: 10, marginLeft: 32, fontSize: 13, color: 'var(--text2)', lineHeight: 1.65, paddingTop: 10, borderTop: '1px solid var(--line)' }}>
                    {answer}
                  </div>
                )}

                {/* Empty state */}
                {!isRec && !answer && (
                  <div style={{ marginTop: 8, marginLeft: 32, fontSize: 12, color: 'var(--text4)', fontStyle: 'italic' }}>
                    Tap the mic to record your answer
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Team submission status */}
        <div style={{ marginTop: 28 }}>
          <div style={{ fontSize: 9, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text4)', marginBottom: 10 }}>
            Team Submissions
          </div>
          <div style={{ border: '1px solid var(--line)', borderRadius: 10, overflow: 'hidden' }}>
            {/* Column headers */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 100px', padding: '7px 14px', borderBottom: '1px solid var(--line)', background: 'var(--bg3)' }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text4)', fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.08em', textTransform: 'uppercase' }}>Sailor</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text4)', fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.08em', textTransform: 'uppercase', textAlign: 'center' }}>Reflection</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text4)', fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.08em', textTransform: 'uppercase', textAlign: 'center' }}>Sim file</span>
            </div>
            {/* Current user row — derived from local state */}
            {userName && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 100px', padding: '9px 14px', borderBottom: '1px solid var(--line)', background: 'var(--bg2)' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{userName}</span>
                <span style={{ textAlign: 'center' }}>
                  {answers.every(a => a !== null)
                    ? <span style={{ color: 'var(--green)', fontSize: 15 }}>✓</span>
                    : <span style={{ fontSize: 11, color: 'var(--text4)' }}>{answers.filter(a => a !== null).length}/{REPORT_PROMPTS.length}</span>
                  }
                </span>
                <span style={{ textAlign: 'center', color: 'var(--text4)', fontSize: 11 }}>—</span>
              </div>
            )}
            <div style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text4)', fontStyle: 'italic' }}>
              Other team members appear here after uploading their sim file below.
            </div>
          </div>
        </div>

        {/* Sim file upload */}
        <div style={{ marginTop: 20 }}>
          <SimDataUpload userName={userName} />
        </div>

      </div>
    </div>
  );
}

// ── Week nav button ───────────────────────────────────────────

function WeekNavBtn({ dir, onClick }: { dir: 'prev' | 'next'; onClick: () => void }) {
  return (
    <button onClick={onClick}
      style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid var(--line)', background: 'var(--bg3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', flexShrink: 0 }}>
      {dir === 'prev'
        ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
        : <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
      }
    </button>
  );
}

// ── Main ──────────────────────────────────────────────────────

export default function Sim() {
  const [weekNum, setWeekNum] = useState(CURRENT_WEEK);
  const [day, setDay] = useState<DayId>('mon');

  const meta = WEEK_META[weekNum];
  const docs = getDocsByDay(weekNum);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100%', overflow: 'hidden' }}>

      {/* ── Header ── */}
      <div style={{ padding: '16px 24px 0', flexShrink: 0, borderBottom: '1px solid var(--line)' }}>

        {/* Simulator label + week navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--sim)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/><path d="M7 8l3 3-3 3M13 14h4"/>
            </svg>
            <span style={{ fontSize: 9, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--sim)' }}>
              Simulator
            </span>
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <WeekNavBtn dir="prev" onClick={() => setWeekNum(n => n - 1)} />
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', minWidth: 60, textAlign: 'center', fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.04em' }}>
              Week {weekNum}
            </span>
            <WeekNavBtn dir="next" onClick={() => setWeekNum(n => n + 1)} />
          </div>
        </div>

        {/* Title */}
        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 14, lineHeight: 1 }}>
          Week {weekNum}{meta?.sublabel ? <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text3)', marginLeft: 8 }}>— {meta.sublabel}</span> : null}
        </div>

        {/* Day tabs — always visible */}
        <div style={{ display: 'flex', gap: 0, marginLeft: -4 }}>
          {DAYS.map(d => {
            const active = day === d.id;
            return (
              <button
                key={d.id}
                onClick={() => setDay(d.id)}
                style={{ padding: '8px 14px', border: 'none', background: 'transparent', borderBottom: active ? '2px solid var(--sim)' : '2px solid transparent', marginBottom: -1, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                <span style={{ fontSize: 13, fontWeight: active ? 700 : 500, color: active ? 'var(--sim)' : 'var(--text3)' }}>{d.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', minHeight: 0 }}>
        {day === 'mon' ? (
          <DayPanel
            docs={docs.mon}
            leftHeader={null}
            renderContent={doc =>
              doc.title === OBJECTIVES_DOC.title ? <ObjectivesContent weekNum={weekNum} /> : null
            }
          />
        ) : day === 'tue' ? (
          <DayPanel
            docs={docs.tue}
            leftHeader={
              <DayPanelHeader
                tag="Practice"
                desc="Captures, observations, and hypotheses from the practice session."
              />
            }
          />
        ) : day === 'thu' ? (
          <DayPanel
            docs={docs.thu}
            leftHeader={
              <DayPanelHeader
                tag="Main Session"
                desc="Pre-sim reference material and session setup for the simulator day."
              />
            }
          />
        ) : (
          <SimReport />
        )}
      </div>
    </div>
  );
}
