'use client';

import { useState } from 'react';
import Link from 'next/link';
import { SimBriefOverview, BlockSimDebrief, DOC_CONTENT } from '@/screens/DayBackbone/BlockContent';
import type { SimDoc } from '@/screens/DayBackbone/BlockContent';
import { IconMic } from '@/components/Icons';

const PHASES = [
  { id: 'brief',   label: 'Brief',   time: '09:30', color: 'var(--sim)' },
  { id: 'sim',     label: 'In Sim',  time: '10:00', color: 'var(--sim)' },
  { id: 'capture', label: 'Capture', time: '14:30', color: 'var(--red)'  },
  { id: 'debrief', label: 'Debrief', time: '15:00', color: 'var(--text3)' },
] as const;

type PhaseId = typeof PHASES[number]['id'];

// ── Phase panels ──────────────────────────────────────────────

function PhaseInSim() {
  return (
    <div style={{ maxWidth: 520, padding: '28px 0 32px' }}>
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
    <div style={{ maxWidth: 520, padding: '28px 0 32px' }}>
      <div style={{ background: 'var(--bg3)', border: '1px solid var(--line)', borderRadius: 10, padding: '16px 18px', marginBottom: 20 }}>
        <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.65 }}>
          Sessions done. Before the debrief, capture your key observations — what felt different, what worked, what surprised you.
        </div>
      </div>
      <Link href="/capture" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '15px', background: 'var(--green)', color: '#fff', borderRadius: 10, textDecoration: 'none', fontWeight: 700, fontSize: 15 }}>
        <IconMic size={18} />Open Capture
      </Link>
    </div>
  );
}

// ── Brief phase — desktop split, mobile list ──────────────────

function PhaseBrief() {
  const [openDoc, setOpenDoc] = useState<SimDoc | null>(null);

  return (
    // Two-column split only for brief (doc list + doc content)
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>
      {/* Left: brief overview + doc list */}
      <div style={{
        width: openDoc ? 300 : '100%',
        maxWidth: openDoc ? 300 : 640,
        flexShrink: 0,
        overflowY: 'auto',
        padding: '20px 24px 32px',
        borderRight: openDoc ? '1px solid var(--line)' : 'none',
        transition: 'width 0.2s ease',
      }}>
        <SimBriefOverview onOpenDoc={setOpenDoc} activeDoc={openDoc} />
      </div>

      {/* Right: doc content (only when a doc is selected) */}
      {openDoc && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          {/* Doc header */}
          <div style={{ padding: '14px 24px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            <button
              onClick={() => setOpenDoc(null)}
              style={{ display: 'flex', alignItems: 'center', gap: 5, height: 28, padding: '0 10px', borderRadius: 6, border: '1px solid var(--line)', background: 'transparent', cursor: 'pointer', fontSize: 12, color: 'var(--text3)', fontFamily: 'inherit', flexShrink: 0 }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
              Close
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{openDoc.title}</div>
              <div style={{ fontSize: 10, color: 'var(--text4)', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: '0.08em' }}>{openDoc.date}</div>
            </div>
            {openDoc.externalHref && (
              <a href={openDoc.externalHref} target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: 4, height: 28, padding: '0 10px', borderRadius: 6, border: '1px solid var(--line)', background: 'transparent', color: 'var(--text4)', textDecoration: 'none', fontSize: 11, fontFamily: 'inherit', flexShrink: 0 }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                Open
              </a>
            )}
          </div>
          {/* Doc content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px 40px' }}>
            {DOC_CONTENT[openDoc.title]}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Sim screen ───────────────────────────────────────────

export default function Sim() {
  const [phase, setPhase] = useState<PhaseId>('brief');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ padding: '18px 24px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--sim)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/><path d="M7 8l3 3-3 3M13 14h4"/>
          </svg>
          <span style={{ fontSize: 9, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--sim)' }}>
            Simulator · Fri 12 Jun
          </span>
        </div>
        <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', marginBottom: 16 }}>
          Week 24 — Onboarding
        </div>

        {/* Phase tabs */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--line)' }}>
          {PHASES.map(p => {
            const active = phase === p.id;
            return (
              <button key={p.id} onClick={() => setPhase(p.id)}
                style={{ padding: '8px 16px', border: 'none', background: 'transparent', borderBottom: active ? `2px solid ${p.color}` : '2px solid transparent', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: active ? 700 : 500, color: active ? p.color : 'var(--text3)', display: 'flex', alignItems: 'center', gap: 6 }}>
                {p.label}
                <span style={{ fontSize: 10, color: active ? p.color : 'var(--text4)', fontFamily: "'Barlow Condensed', sans-serif", opacity: 0.75 }}>{p.time}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {phase === 'brief' && <PhaseBrief />}
        {phase === 'sim' && <div style={{ padding: '0 24px', overflowY: 'auto' }}><PhaseInSim /></div>}
        {phase === 'capture' && <div style={{ padding: '0 24px', overflowY: 'auto' }}><PhaseCapture /></div>}
        {phase === 'debrief' && <div style={{ padding: '20px 24px 32px', overflowY: 'auto' }}><BlockSimDebrief /></div>}
      </div>
    </div>
  );
}
