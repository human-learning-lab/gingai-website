'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BlockSimBrief, BlockSimDebrief } from '@/screens/DayBackbone/BlockContent';
import { IconMic } from '@/components/Icons';

// ── Phase definitions ─────────────────────────────────────────

const PHASES = [
  { id: 'brief',   label: 'Brief',    time: '09:30' },
  { id: 'sim',     label: 'In Sim',   time: '10:00' },
  { id: 'capture', label: 'Capture',  time: '14:30' },
  { id: 'debrief', label: 'Debrief',  time: '15:00' },
] as const;

type PhaseId = typeof PHASES[number]['id'];

// ── In Sim panel ──────────────────────────────────────────────

function PhaseInSim() {
  return (
    <div style={{ padding: '0 20px 32px' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 10, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--sim)', marginBottom: 4 }}>Now running</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', lineHeight: 1.2 }}>Simulator Session</div>
      </div>

      <div style={{ background: 'color-mix(in srgb, var(--sim) 8%, var(--bg))', border: '1px solid var(--sb)', borderRadius: 10, padding: '16px', marginBottom: 20 }}>
        <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.65 }}>
          You're in the simulator right now. GingAI is here when you need it — use Capture to log thoughts between runs, or check your Alarms.
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Link href="/capture" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px', background: 'var(--green)', color: '#fff', borderRadius: 10, textDecoration: 'none', fontWeight: 700, fontSize: 13 }}>
          <IconMic size={16} />
          Capture note
        </Link>
        <Link href="/alarms" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px', background: 'var(--bg3)', color: 'var(--text)', borderRadius: 10, textDecoration: 'none', fontWeight: 600, fontSize: 13, border: '1px solid var(--line)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          Alarms
        </Link>
      </div>
    </div>
  );
}

// ── Capture panel ─────────────────────────────────────────────

function PhaseCapture() {
  return (
    <div style={{ padding: '0 20px 32px' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 10, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--red)', marginBottom: 4 }}>Capture window</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', lineHeight: 1.2 }}>Record your thoughts</div>
      </div>

      <div style={{ background: 'var(--bg3)', border: '1px solid var(--line)', borderRadius: 10, padding: '16px', marginBottom: 20 }}>
        <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.65 }}>
          Sessions are done. Before the debrief, capture your key observations — what felt different, what worked, what surprised you.
        </div>
      </div>

      <Link href="/capture" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '16px', background: 'var(--green)', color: '#fff', borderRadius: 10, textDecoration: 'none', fontWeight: 700, fontSize: 15 }}>
        <IconMic size={18} />
        Open Capture
      </Link>
    </div>
  );
}

// ── Main Sim screen ───────────────────────────────────────────

export default function Sim() {
  const [phase, setPhase] = useState<PhaseId>('brief');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ padding: '16px 20px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--sim)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
            <path d="M7 8l3 3-3 3M13 14h4"/>
          </svg>
          <span style={{ fontSize: 10, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--sim)' }}>
            Simulator Training · Fri 12 Jun
          </span>
        </div>
        <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)', lineHeight: 1.15, marginBottom: 16 }}>
          Week 24 — Onboarding
        </div>

        {/* Phase tabs */}
        <div style={{ display: 'flex', gap: 6, borderBottom: '1px solid var(--line)', paddingBottom: 0 }}>
          {PHASES.map(p => {
            const active = phase === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setPhase(p.id)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px 8px 0 0',
                  border: 'none',
                  background: active ? 'var(--bg)' : 'transparent',
                  borderBottom: active ? `2px solid var(--sim)` : '2px solid transparent',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontSize: 13,
                  fontWeight: active ? 700 : 500,
                  color: active ? 'var(--sim)' : 'var(--text3)',
                  transition: 'all 0.12s',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                {p.label}
                <span style={{ fontSize: 9, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, letterSpacing: '0.06em', color: active ? 'var(--sim)' : 'var(--text4)', opacity: 0.8 }}>{p.time}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Panel content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {phase === 'brief'   && <BlockSimBrief />}
        {phase === 'sim'     && <PhaseInSim />}
        {phase === 'capture' && <PhaseCapture />}
        {phase === 'debrief' && <BlockSimDebrief />}
      </div>
    </div>
  );
}
