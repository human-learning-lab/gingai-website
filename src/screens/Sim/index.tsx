'use client';

import { useState } from 'react';
import Link from 'next/link';
import { SimBriefOverview, BlockSimDebrief, SIM_DOCS, DOC_CONTENT } from '@/screens/DayBackbone/BlockContent';
import type { SimDoc } from '@/screens/DayBackbone/BlockContent';
import { IconMic } from '@/components/Icons';

// ── Phase definitions ─────────────────────────────────────────

const PHASES = [
  { id: 'brief',   label: 'Brief',   time: '09:30', color: 'var(--sim)' },
  { id: 'sim',     label: 'In Sim',  time: '10:00', color: 'var(--sim)' },
  { id: 'capture', label: 'Capture', time: '14:30', color: 'var(--red)'  },
  { id: 'debrief', label: 'Debrief', time: '15:00', color: 'var(--text3)' },
] as const;

type PhaseId = typeof PHASES[number]['id'];

// ── Doc content panel ─────────────────────────────────────────

function DocContent({ doc }: { doc: SimDoc }) {
  const content = DOC_CONTENT[doc.title];
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
        <div style={{ fontSize: 10, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text4)', marginBottom: 4 }}>{doc.date} · {doc.type === 'pdf' ? 'PDF' : 'Google Doc'}</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', lineHeight: 1.2 }}>{doc.title}</div>
          {doc.externalHref && (
            <a href={doc.externalHref} target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 6, border: '1px solid var(--line)', background: 'var(--bg3)', color: 'var(--text4)', textDecoration: 'none', fontSize: 11, fontWeight: 600, flexShrink: 0 }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              Open
            </a>
          )}
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px 40px' }}>
        {content ?? <div style={{ color: 'var(--text4)', fontSize: 13 }}>No content available.</div>}
      </div>
    </div>
  );
}

// ── Phase content panels ──────────────────────────────────────

function PhaseBrief({ openDoc, setOpenDoc }: { openDoc: SimDoc | null; setOpenDoc: (d: SimDoc | null) => void }) {
  return (
    <div style={{ padding: '20px 24px 32px', overflowY: 'auto', height: '100%' }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 10, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--sim)', marginBottom: 4 }}>Session brief</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>Objectives & Documents</div>
      </div>
      <SimBriefOverview onOpenDoc={setOpenDoc} activeDoc={openDoc} />
    </div>
  );
}

function PhaseInSim() {
  return (
    <div style={{ padding: '20px 24px 32px' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 10, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--sim)', marginBottom: 4 }}>Now running</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>Simulator Session</div>
      </div>
      <div style={{ background: 'color-mix(in srgb, var(--sim) 8%, var(--bg))', border: '1px solid var(--sb)', borderRadius: 10, padding: '16px', marginBottom: 20 }}>
        <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.65 }}>
          You're in the simulator. GingAI is here when you need it — use Capture to log thoughts between runs, or check your Alarms.
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Link href="/capture" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px', background: 'var(--green)', color: '#fff', borderRadius: 10, textDecoration: 'none', fontWeight: 700, fontSize: 13 }}>
          <IconMic size={16} />Capture note
        </Link>
        <Link href="/alarms" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px', background: 'var(--bg3)', color: 'var(--text)', borderRadius: 10, textDecoration: 'none', fontWeight: 600, fontSize: 13, border: '1px solid var(--line)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          Alarms
        </Link>
      </div>
    </div>
  );
}

function PhaseCapture() {
  return (
    <div style={{ padding: '20px 24px 32px' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 10, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--red)', marginBottom: 4 }}>Capture window</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>Record your thoughts</div>
      </div>
      <div style={{ background: 'var(--bg3)', border: '1px solid var(--line)', borderRadius: 10, padding: '16px', marginBottom: 20 }}>
        <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.65 }}>
          Sessions are done. Before the debrief, capture your key observations — what felt different, what worked, what surprised you.
        </div>
      </div>
      <Link href="/capture" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '16px', background: 'var(--green)', color: '#fff', borderRadius: 10, textDecoration: 'none', fontWeight: 700, fontSize: 15 }}>
        <IconMic size={18} />Open Capture
      </Link>
    </div>
  );
}

// ── Left sidebar ──────────────────────────────────────────────

function Sidebar({ phase, setPhase, openDoc, setOpenDoc }: {
  phase: PhaseId;
  setPhase: (p: PhaseId) => void;
  openDoc: SimDoc | null;
  setOpenDoc: (d: SimDoc | null) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', borderRight: '1px solid var(--line)', overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ padding: '20px 18px 16px', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--sim)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/><path d="M7 8l3 3-3 3M13 14h4"/>
          </svg>
          <span style={{ fontSize: 9, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--sim)' }}>Simulator</span>
        </div>
        <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', lineHeight: 1.2 }}>Week 24 — Onboarding</div>
        <div style={{ fontSize: 11, color: 'var(--text4)', marginTop: 2 }}>Fri 12 Jun 2026</div>
      </div>

      {/* Phase tabs */}
      <div style={{ padding: '10px 10px 0', flexShrink: 0 }}>
        <div style={{ fontSize: 9, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text4)', padding: '0 8px', marginBottom: 4 }}>Phases</div>
        {PHASES.map(p => {
          const active = phase === p.id && !openDoc;
          return (
            <button key={p.id} onClick={() => { setPhase(p.id); setOpenDoc(null); }}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 8, border: 'none', background: active ? 'var(--bg3)' : 'transparent', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', marginBottom: 2 }}
            >
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: active ? p.color : 'var(--line)', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: active ? 700 : 500, color: active ? 'var(--text)' : 'var(--text3)' }}>{p.label}</div>
              </div>
              <div style={{ fontSize: 10, color: 'var(--text4)', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, letterSpacing: '0.04em' }}>{p.time}</div>
            </button>
          );
        })}
      </div>

      {/* Documents */}
      <div style={{ padding: '14px 10px 10px', flex: 1 }}>
        <div style={{ fontSize: 9, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text4)', padding: '0 8px', marginBottom: 6 }}>Documents</div>
        {SIM_DOCS.map((doc, i) => {
          const active = openDoc?.title === doc.title;
          return (
            <button key={i} onClick={() => { setOpenDoc(doc); setPhase('brief'); }}
              style={{ width: '100%', display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 10px', borderRadius: 8, border: 'none', background: active ? 'var(--sg)' : 'transparent', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', marginBottom: 2 }}
            >
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: active ? 'var(--sim)' : 'var(--line)', flexShrink: 0, marginTop: 5 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: active ? 700 : 500, color: active ? 'var(--text)' : 'var(--text3)', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.title}</div>
                <div style={{ fontSize: 10, color: 'var(--text4)', marginTop: 1 }}>{doc.date}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Sim screen ───────────────────────────────────────────

export default function Sim() {
  const [phase, setPhase]       = useState<PhaseId>('brief');
  const [openDoc, setOpenDoc]   = useState<SimDoc | null>(null);

  const content = openDoc ? (
    <DocContent doc={openDoc} />
  ) : phase === 'brief' ? (
    <PhaseBrief openDoc={openDoc} setOpenDoc={setOpenDoc} />
  ) : phase === 'sim' ? (
    <PhaseInSim />
  ) : phase === 'capture' ? (
    <PhaseCapture />
  ) : (
    <div style={{ padding: '20px 24px 32px', overflowY: 'auto', height: '100%' }}><BlockSimDebrief /></div>
  );

  return (
    <>
      {/* Desktop two-column layout */}
      <div className="desk-only" style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
        <div style={{ width: 220, flexShrink: 0 }}>
          <Sidebar phase={phase} setPhase={setPhase} openDoc={openDoc} setOpenDoc={setOpenDoc} />
        </div>
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {content}
        </div>
      </div>

      {/* Mobile layout — tabs at top */}
      <div className="mob-only" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        {/* Mobile header */}
        <div style={{ padding: '14px 16px 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--sim)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/><path d="M7 8l3 3-3 3M13 14h4"/>
            </svg>
            <span style={{ fontSize: 9, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--sim)' }}>Simulator · Fri 12 Jun</span>
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginBottom: 12 }}>Week 24 — Onboarding</div>

          {/* If a doc is open on mobile, show back button + doc title */}
          {openDoc ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 12, borderBottom: '1px solid var(--line)' }}>
              <button onClick={() => setOpenDoc(null)}
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 6, border: '1px solid var(--line)', background: 'transparent', cursor: 'pointer', fontSize: 12, color: 'var(--text3)', fontFamily: 'inherit' }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
                Back
              </button>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{openDoc.title}</span>
              {openDoc.externalHref && (
                <a href={openDoc.externalHref} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 6, border: '1px solid var(--line)', background: 'transparent', color: 'var(--text4)', textDecoration: 'none', fontSize: 11, flexShrink: 0 }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                  Open
                </a>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--line)' }}>
              {PHASES.map(p => {
                const active = phase === p.id;
                return (
                  <button key={p.id} onClick={() => setPhase(p.id)}
                    style={{ padding: '8px 12px', borderRadius: '7px 7px 0 0', border: 'none', background: 'transparent', borderBottom: active ? `2px solid ${p.color}` : '2px solid transparent', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: active ? 700 : 500, color: active ? p.color : 'var(--text3)' }}>
                    {p.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Mobile content */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {content}
        </div>
      </div>
    </>
  );
}
