'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BlockSimDebrief, SIM_DOCS, DOC_CONTENT } from '@/screens/DayBackbone/BlockContent';
import type { SimDoc } from '@/screens/DayBackbone/BlockContent';
import { IconMic } from '@/components/Icons';

const PHASES = [
  { id: 'brief',   label: 'Brief',   time: '09:30', color: 'var(--sim)' },
  { id: 'sim',     label: 'In Sim',  time: '10:00', color: 'var(--sim)' },
  { id: 'capture', label: 'Capture', time: '14:30', color: 'var(--red)'  },
  { id: 'debrief', label: 'Debrief', time: '15:00', color: 'var(--text3)' },
] as const;
type PhaseId = typeof PHASES[number]['id'];

// Group docs by date for folder structure
const DOC_GROUPS = [
  { date: 'Mon 8 Jun', docs: SIM_DOCS.filter(d => d.date === 'Mon 8 Jun') },
  { date: 'Tue 9 Jun', docs: SIM_DOCS.filter(d => d.date === 'Tue 9 Jun') },
];

// ── File browser ──────────────────────────────────────────────

function FileBrowser({ selected, onSelect }: { selected: SimDoc; onSelect: (d: SimDoc) => void }) {
  return (
    <div>
      {DOC_GROUPS.map(group => (
        <div key={group.date} style={{ marginBottom: 4 }}>
          {/* Folder row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', marginBottom: 1 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="var(--text4)" stroke="none">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text4)', fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              {group.date}
            </span>
          </div>

          {/* Files */}
          {group.docs.map((doc, i) => {
            const active = selected.title === doc.title;
            const isGdoc = doc.type === 'gdoc';
            return (
              <button
                key={i}
                onClick={() => onSelect(doc)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                  padding: '6px 8px 6px 22px',
                  background: active ? 'color-mix(in srgb, var(--sim) 12%, var(--bg))' : 'transparent',
                  border: 'none', borderRadius: 6, cursor: 'pointer',
                  fontFamily: 'inherit', textAlign: 'left', marginBottom: 1,
                }}
              >
                {/* File icon */}
                {isGdoc ? (
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
                <span style={{
                  fontSize: 12, lineHeight: 1.3, flex: 1, minWidth: 0,
                  fontWeight: active ? 600 : 400,
                  color: active ? 'var(--text)' : 'var(--text2)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {doc.title}
                </span>
                {isGdoc && (
                  <span style={{ fontSize: 8, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: '0.08em', color: '#4285f4', flexShrink: 0 }}>LIVE</span>
                )}
              </button>
            );
          })}
        </div>
      ))}

      {/* Friday objectives — pending */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px 6px 22px', opacity: 0.45 }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text4)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/>
        </svg>
        <div>
          <div style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.2 }}>Friday Objectives</div>
          <div style={{ fontSize: 10, color: 'var(--text4)', marginTop: 1 }}>Rasmus posts before 08:30</div>
        </div>
      </div>
    </div>
  );
}

// ── Brief phase — always split ────────────────────────────────

function PhaseBrief() {
  const [selected, setSelected] = useState<SimDoc>(SIM_DOCS[0]);

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>

      {/* Left: file browser */}
      <div style={{ width: 260, flexShrink: 0, display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--line)', overflow: 'hidden' }}>
        {/* Objectives banner (compact) */}
        <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
          <div style={{ fontSize: 9, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--sim)', marginBottom: 3 }}>
            Fri 12 Jun — Objectives
          </div>
          <div style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.5 }}>
            Being set by Rasmus — check here when session starts.
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
            <Link href="/capture" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '7px 0', background: 'var(--green)', color: '#fff', borderRadius: 7, textDecoration: 'none', fontWeight: 700, fontSize: 11 }}>
              <IconMic size={12} />Capture
            </Link>
            <Link href="/alarms" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '7px 0', background: 'var(--bg3)', color: 'var(--text2)', borderRadius: 7, textDecoration: 'none', fontWeight: 600, fontSize: 11, border: '1px solid var(--line)' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              Alarms
            </Link>
          </div>
        </div>

        {/* File browser */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 6px' }}>
          <FileBrowser selected={selected} onSelect={setSelected} />
        </div>
      </div>

      {/* Right: doc content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        <div style={{ padding: '14px 24px 12px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selected.title}</div>
            <div style={{ fontSize: 10, color: 'var(--text4)', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: '0.06em', marginTop: 2 }}>{selected.date} · {selected.type === 'pdf' ? 'PDF' : 'Google Doc'}</div>
          </div>
          {selected.externalHref && (
            <a href={selected.externalHref} target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 6, border: '1px solid var(--line)', background: 'var(--bg3)', color: 'var(--text4)', textDecoration: 'none', fontSize: 11, fontWeight: 600, flexShrink: 0 }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              Open
            </a>
          )}
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px 40px' }}>
          {DOC_CONTENT[selected.title]}
        </div>
      </div>
    </div>
  );
}

// ── Other phase panels ────────────────────────────────────────

function PhaseInSim() {
  return (
    <div style={{ padding: '24px', maxWidth: 520 }}>
      <div style={{ background: 'color-mix(in srgb, var(--sim) 8%, var(--bg))', border: '1px solid var(--sb)', borderRadius: 10, padding: '16px 18px', marginBottom: 20 }}>
        <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.65 }}>
          You're in the simulator. GingAI is here when you need it — capture thoughts between runs, or check your Alarms.
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Link href="/capture" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '13px 16px', background: 'var(--green)', color: '#fff', borderRadius: 10, textDecoration: 'none', fontWeight: 700, fontSize: 14 }}>
          <IconMic size={16} />Capture note
        </Link>
        <Link href="/alarms" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '13px 16px', background: 'var(--bg3)', color: 'var(--text)', borderRadius: 10, textDecoration: 'none', fontWeight: 600, fontSize: 14, border: '1px solid var(--line)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          Alarms
        </Link>
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
