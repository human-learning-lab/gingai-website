'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BlockSimDebrief, SIM_DOCS, DOC_CONTENT } from '@/screens/DayBackbone/BlockContent';
import type { SimDoc } from '@/screens/DayBackbone/BlockContent';
import { IconMic } from '@/components/Icons';

const PHASES = [
  { id: 'brief',   label: 'Brief',   time: '08:30', color: 'var(--sim)' },
  { id: 'sim',     label: 'In Sim',  time: '09:00', color: 'var(--sim)' },
  { id: 'capture', label: 'Capture', time: '14:30', color: 'var(--red)'  },
  { id: 'debrief', label: 'Debrief', time: '15:00', color: 'var(--text3)' },
] as const;
type PhaseId = typeof PHASES[number]['id'];


// ── File browser ──────────────────────────────────────────────

function FileBrowser({ selected, onSelect }: { selected: SimDoc; onSelect: (d: SimDoc) => void }) {
  return (
    <div>
      <div style={{ fontSize: 9, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text4)', padding: '4px 8px 6px' }}>
        Session Documents
      </div>
      {SIM_DOCS.map((doc, i) => {
        const active = selected.title === doc.title;
        const isGdoc = doc.type === 'gdoc';
        const isVideo = doc.type === 'video';
        return (
          <button
            key={i}
            onClick={() => onSelect(doc)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 8,
              padding: '7px 8px',
              background: active ? 'color-mix(in srgb, var(--sim) 12%, var(--bg))' : 'transparent',
              border: 'none', borderRadius: 6, cursor: 'pointer',
              fontFamily: 'inherit', textAlign: 'left', marginBottom: 1,
            }}
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

// ── Shared doc header ─────────────────────────────────────────

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

// ── Objectives ────────────────────────────────────────────────

const OBSERVATIONS = [
  'What TTK / ratio was best for optimal final kill before trigger pull?',
  'What positioning at T2 was good — north/south, first/last in train?',
  'What positioning at T2 was bad — north/south, first/last in train?',
  'Can we relate 2024 video observations to the sim, or do numbers need calibrating?',
];

function BriefObjectives({ compact = false }: { compact?: boolean }) {
  return (
    <div style={{ padding: compact ? '12px 14px 12px' : '16px 16px 14px', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
      <div style={{ fontSize: 9, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--sim)', marginBottom: 8 }}>
        Fri 12 Jun · Session Objectives
      </div>

      {/* Main objective */}
      <div style={{ background: 'color-mix(in srgb, var(--sim) 8%, var(--bg))', border: '1px solid var(--sb)', borderRadius: 8, padding: '10px 12px', marginBottom: 10 }}>
        <div style={{ fontSize: compact ? 11 : 12, fontWeight: 700, color: 'var(--text)', lineHeight: 1.45, marginBottom: 4 }}>
          Evaluate T2 timing & positioning
        </div>
        <div style={{ fontSize: compact ? 10 : 11, color: 'var(--text3)', lineHeight: 1.5 }}>
          Using courses 150° and 345° TWD — focus on M1 position and ability to get early gybe on northerly course.
        </div>
      </div>

      {/* Observations */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 9, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text4)', marginBottom: 6 }}>
          What we're looking for
        </div>
        {OBSERVATIONS.map((obs, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 5 }}>
            <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'var(--sg)', border: '1px solid var(--sb)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
              <span style={{ fontSize: 8, fontWeight: 800, color: 'var(--sim)', fontFamily: "'Barlow Condensed', sans-serif" }}>{i + 1}</span>
            </div>
            <div style={{ fontSize: compact ? 10 : 11, color: 'var(--text2)', lineHeight: 1.5 }}>{obs}</div>
          </div>
        ))}
      </div>

    </div>
  );
}

// ── Brief phase ───────────────────────────────────────────────

function PhaseBrief() {
  const [selected, setSelected] = useState<SimDoc>(SIM_DOCS[0]);
  const [mobileDocOpen, setMobileDocOpen] = useState(false);

  const allDocs = SIM_DOCS;
  const currentIdx = allDocs.findIndex(d => d.title === selected.title);
  const prevDoc = currentIdx > 0 ? allDocs[currentIdx - 1] : null;
  const nextDoc = currentIdx < allDocs.length - 1 ? allDocs[currentIdx + 1] : null;

  function selectDoc(doc: SimDoc) {
    setSelected(doc);
    setMobileDocOpen(true);
  }

  return (
    <>
      {/* ── Desktop: always-split layout ── */}
      <div className="desk-only" style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
        {/* Left: objectives + file browser */}
        <div style={{ width: 260, flexShrink: 0, display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--line)', overflow: 'hidden' }}>
          <BriefObjectives compact />
          <div style={{ flex: 1, overflowY: 'auto', padding: '10px 6px' }}>
            <FileBrowser selected={selected} onSelect={setSelected} />
          </div>
        </div>
        {/* Right: doc content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          <DocHeader doc={selected} />
          {selected.type === 'video' && selected.embedSrc ? (
            <iframe src={selected.embedSrc} allow="autoplay" style={{ flex: 1, width: '100%', border: 'none', display: 'block', minHeight: 0 }} title={selected.title} />
          ) : (
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px 40px' }}>
              {DOC_CONTENT[selected.title]}
            </div>
          )}
        </div>
      </div>

      {/* ── Mobile: list → full-screen doc ── */}
      <div className="mob-only" style={{ flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
        {mobileDocOpen ? (
          /* Full-screen doc view */
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
            {selected.type === 'video' && selected.embedSrc ? (
              <iframe src={selected.embedSrc} allow="autoplay" style={{ flex: 1, width: '100%', border: 'none', display: 'block', minHeight: 0 }} title={selected.title} />
            ) : (
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 0' }}>
              {DOC_CONTENT[selected.title]}

              {/* Prev / Next navigation */}
              <div style={{ display: 'flex', gap: 8, padding: '20px 0 40px', borderTop: '1px solid var(--line)', marginTop: 24 }}>
                {prevDoc ? (
                  <button onClick={() => setSelected(prevDoc)}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px', background: 'var(--bg3)', border: '1px solid var(--line)', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 9, color: 'var(--text4)', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 2 }}>Previous</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{prevDoc.title}</div>
                    </div>
                  </button>
                ) : <div style={{ flex: 1 }} />}

                {nextDoc ? (
                  <button onClick={() => setSelected(nextDoc)}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px', background: 'var(--bg3)', border: '1px solid var(--line)', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'right', justifyContent: 'flex-end' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 9, color: 'var(--text4)', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 2 }}>Next</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nextDoc.title}</div>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
                  </button>
                ) : <div style={{ flex: 1 }} />}
              </div>
            </div>
          </div>
        ) : (
          /* Doc list */
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <BriefObjectives />
            <div style={{ padding: '10px 10px' }}>
              <FileBrowser selected={selected} onSelect={selectDoc} />
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ── Other phase panels ────────────────────────────────────────

function PhaseInSim() {
  return (
    <div style={{ padding: '24px', maxWidth: 520 }}>
      <div style={{ background: 'color-mix(in srgb, var(--sim) 8%, var(--bg))', border: '1px solid var(--sb)', borderRadius: 10, padding: '16px 18px' }}>
        <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.65 }}>
          You're in the simulator. GingAI is here when you need it between runs.
        </div>
      </div>
    </div>
  );
}

function PhaseCapture() {
  return (
    <div style={{ padding: '24px', maxWidth: 520 }}>
      <div style={{ background: 'var(--bg3)', border: '1px solid var(--line)', borderRadius: 10, padding: '16px 18px', marginBottom: 20 }}>
        <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.65 }}>
          Sessions done. Before the debrief, capture your key observations — what felt different, what worked, what surprised you.
        </div>
      </div>
      <Link href="/capture" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '15px', background: 'var(--green)', color: '#fff', borderRadius: 10, textDecoration: 'none', fontWeight: 700, fontSize: 15, maxWidth: 300 }}>
        <IconMic size={18} />Open Capture
      </Link>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────

export default function Sim() {
  const [phase, setPhase] = useState<PhaseId>('brief');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* Header + phase tabs */}
      <div style={{ padding: '18px 24px 0', flexShrink: 0, borderBottom: '1px solid var(--line)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--sim)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/><path d="M7 8l3 3-3 3M13 14h4"/>
          </svg>
          <span style={{ fontSize: 9, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--sim)' }}>
            Simulator · Fri 12 Jun
          </span>
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 14 }}>
          Week 24 — Onboarding
        </div>
        <div style={{ display: 'flex', gap: 0 }}>
          {PHASES.map(p => {
            const active = phase === p.id;
            return (
              <button key={p.id} onClick={() => setPhase(p.id)}
                style={{ padding: '8px 16px', border: 'none', background: 'transparent', borderBottom: active ? `2px solid ${p.color}` : '2px solid transparent', marginBottom: -1, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: active ? 700 : 500, color: active ? p.color : 'var(--text3)', display: 'flex', alignItems: 'center', gap: 6 }}>
                {p.label}
                <span style={{ fontSize: 10, color: active ? p.color : 'var(--text4)', fontFamily: "'Barlow Condensed', sans-serif", opacity: 0.7 }}>{p.time}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content area */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', minHeight: 0 }}>
        {phase === 'brief'   && <PhaseBrief />}
        {phase === 'sim'     && <div style={{ overflowY: 'auto', width: '100%' }}><PhaseInSim /></div>}
        {phase === 'capture' && <div style={{ overflowY: 'auto', width: '100%' }}><PhaseCapture /></div>}
        {phase === 'debrief' && <div style={{ overflowY: 'auto', width: '100%', padding: '20px 24px 32px' }}><BlockSimDebrief /></div>}
      </div>
    </div>
  );
}
