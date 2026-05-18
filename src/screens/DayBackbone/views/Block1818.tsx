'use client';

import { useRole } from '@/context/RoleContext';
import { IconStar, IconMic } from '@/components/Icons';

const SAILORS = [
  { name: 'Martine', init: 'MG', focus: 'Boat speed · Pre-start positioning' },
  { name: 'Rasmus',  init: 'RK', focus: 'Tack timing · Flight stability · Offset call' },
  { name: 'Pietro',  init: 'PS', focus: 'Wing trim · Start sequence comms' },
  { name: 'Paul G.', init: 'PG', focus: 'Start line bias · Tactical calls' },
  { name: 'Mateus',  init: 'MI', focus: 'Grinder load · Foil transitions' },
  { name: 'Marco',   init: 'MC', focus: 'Port gybe timing · Grinder G2 load' },
];

export default function Block1818() {
  const { role } = useRole();
  const isMe = (name: string) => role?.view === 'sailor' && name === role.name;

  return (
    <>
      <div className="main-top">
        <div className="eyebrow">18:18 · Phase 2 — Capture · Activates at dock-in</div>
        <div className="page-title">
          R7 → Capture Opens <span className="ptag ptag-r">Capture</span>
        </div>
      </div>

      <div className="gen-panel" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        <div className="card card-r" style={{ marginBottom: 12 }}>
          <div className="card-label" style={{ color: 'var(--red)', display: 'flex', alignItems: 'center', gap: 5 }}>
            <IconMic size={10} /> How Capture works
          </div>
          <div className="ai-body">
            Activates automatically at dock-in after R7. Each sailor receives an AI voice interview on their phone —
            5–8 min structured reflection guided by the 5 Whys method. Results are synthesised in real-time as sailors complete.
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 14 }}>
            {['Opening', 'Why 1', 'Why 2', 'Why 3', 'Why 4', 'Why 5'].map((label, i) => (
              <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ height: 3, borderRadius: 2, marginBottom: 5, background: 'var(--line2)' }} />
                <div style={{ fontSize: 9, color: 'var(--text4)', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ marginBottom: 12 }}>
          <div className="card-label">Sailor Status · 6 scheduled</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, margin: '0 -18px -18px', borderTop: '1px solid var(--line)' }}>
            {SAILORS.map((s, i) => (
              <div key={s.name} style={{
                padding: '12px 18px',
                borderRight: i % 2 === 0 ? '1px solid var(--line)' : 'none',
                borderBottom: i < SAILORS.length - 2 ? '1px solid var(--line)' : 'none',
                background: isMe(s.name) ? 'var(--gg)' : 'transparent',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                  <div className="s-ava" style={{
                    width: 24, height: 24,
                    color: isMe(s.name) ? 'var(--green)' : 'var(--text3)',
                    borderColor: isMe(s.name) ? 'var(--gb)' : undefined,
                    background: isMe(s.name) ? 'var(--gg)' : undefined,
                    fontSize: 10,
                  }}>
                    {s.init}
                    <div className="sdot" style={{ background: 'var(--line2)', width: 7, height: 7 }} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 500, color: isMe(s.name) ? 'var(--text)' : 'var(--text2)' }}>
                    {s.name}{isMe(s.name) ? ' · You' : ''}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.4, paddingLeft: 32 }}>
                  {s.focus}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card card-g">
          <div className="card-label" style={{ color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 5 }}>
            <IconStar /> GingAI · Pre-loaded Context
          </div>
          <div className="ai-body">
            Opening question anchored to each sailor&apos;s individual brief from today&apos;s Prime session.
            AI will cross-reference live responses with Oracle telemetry in real-time to surface
            data-backed follow-up questions.
          </div>
        </div>
      </div>
    </>
  );
}
