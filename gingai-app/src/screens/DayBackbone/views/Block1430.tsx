import { useState } from 'react';
import { useRole } from '../../../context/RoleContext';
import { IconStar } from '../../../components/Icons';

const DOCS = [
  { name: 'São Paulo — Race Analysis R1–R4', meta: 'Updated 2h ago · 14 pages', type: 'Data',    badge: 'doc-badge-data' },
  { name: 'Team Golden Rules — Current Season', meta: '12 active rules',          type: 'Memory',  badge: 'doc-badge-memory' },
  { name: 'Video — Mark 2 Tack Comparison (R3 vs Fleet)', meta: '2:34 · Auto-clipped', type: 'Video', badge: 'doc-badge-video' },
  { name: 'Open Action Items — R3/R4 Debrief', meta: '4 open · 2 done',           type: 'Actions', badge: 'doc-badge-actions' },
];

const FOCUS_ATHLETE = [
  { n: 1, t: 'Tack at Mark 2 — commit early, own the call', d: "Trigger within 3 BL of the mark. Your read to own — don't wait for a secondary signal.", stat: '-8.3% VMG loss yesterday', m: 'Target: <15s tack duration · Rule #7' },
  { n: 2, t: 'Flight stability entering the zone',           d: 'R4 showed 3 foil touchdowns in the pre-start zone. Height management 200m before the line.',       stat: '3 touchdowns in R4', m: 'Watch: Rudder aggression index' },
  { n: 3, t: 'Gybe call at offset — read fleet first',       d: '10 kts = marginal lift. Read fleet proximity before committing. "Hold" or "Go" — two options only.', stat: '10 kts marginal window', m: 'Signal: "Hold" / "Go" · Rule #11' },
];

const FOCUS_TEAM = [
  { name: 'Martine', role: 'Helm / Driver',      init: 'MG', points: ['Boat speed — foil height in pre-start zone', 'Start line bias · positioning off the line'] },
  { name: 'Rasmus',  role: 'Flight Controller',  init: 'RK', points: ['Tack at Mark 2 — commit within 3 BL', 'Flight stability entering the zone', 'Gybe call at offset — read fleet first'] },
  { name: 'Pietro',  role: 'Wing Trimmer',       init: 'PS', points: ['Wing cant at 78–80° · marginal lift conditions', 'Start sequence comms — two-word calls only'] },
  { name: 'Mateus',  role: 'Grinder G1',         init: 'MI', points: ['Grinder load management · foil transitions', 'Support Rasmus on flight height cues'] },
  { name: 'Marco',   role: 'Grinder G2',         init: 'MC', points: ['Port gybe timing · consistent load', 'Communication with Mateus on foil transitions'] },
  { name: 'Paul G.', role: 'Strategist',         init: 'PG', points: ['Start line bias read · port vs starboard layline', 'Fleet positioning call — offset gybe timing'] },
];

const CHAT = [
  { init: 'PB', name: 'Paul B.',  ts: '13:58', ai: false, color: 'var(--text2)', txt: 'Briefing pack is live. Wind reading 9.8–11.2 at the course, SSW, consistent. Read the mark 2 tack analysis before we start.' },
  { init: 'G',  name: 'GingAI', ts: '14:02', ai: true,  color: 'var(--green)', txt: 'Oracle telemetry + wind data: 10 kts SSW matches the marginal flight window for the Brazil F50. Recommend wing cant at 78–80° for max stability. The tack at mark 2 in similar conditions (R1, Bermuda Day 2) cost 11.3m.' },
  { init: 'RK', name: 'Rasmus', ts: '14:18', ai: false, color: 'var(--green)', txt: 'Good call on the cant. I want to settle who calls the gybe at the offset today before we go on the water.' },
  { init: 'PS', name: 'Pietro', ts: '14:21', ai: false, color: 'var(--yellow)', txt: "Rasmus owns the offset call. I'll handle wing cant through the mark. 3 BL = go, no confirmation?" },
];

export default function Block1430() {
  const [tab, setTab] = useState<'briefing' | 'focus' | 'chat'>('briefing');
  const { role } = useRole();

  return (
    <>
      <div className="main-top">
        <div className="eyebrow">14:30 · Phase 1 — Prime</div>
        <div className="page-title">
          Brief the Day <span className="ptag ptag-g">Prime</span>
        </div>
      </div>

      <div className="tabs">
        <div className={`tab${tab === 'briefing' ? ' on' : ''}`} onClick={() => setTab('briefing')}>Briefing Pack</div>
        <div className={`tab${tab === 'focus' ? ' on' : ''}`} onClick={() => setTab('focus')}>
          {role.view === 'sailor' ? 'My Focus Points' : 'Focus Points'}
        </div>
        <div className={`tab${tab === 'chat' ? ' on' : ''}`} onClick={() => setTab('chat')}>
          Chat <span style={{ color: 'var(--green)', marginLeft: 3, fontSize: 10 }}>3</span>
        </div>
      </div>

      {/* ── BRIEFING ── */}
      {tab === 'briefing' && (
        <div className="pane on" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

          {/* Conditions card */}
          <div className="card" style={{ display: 'flex', gap: 0, padding: 0, overflow: 'hidden' }}>
            {[
              { label: 'Wind', val: '10–12', unit: 'kts', color: 'var(--text)' },
              { label: 'Direction', val: 'SSW', unit: 'steady', color: 'var(--text2)' },
              { label: 'Course', val: 'Course 2', unit: 'Mark A upwind', color: 'var(--yellow)' },
            ].map((c, i) => (
              <div key={i} style={{
                flex: 1, padding: '16px 18px',
                borderRight: i < 2 ? '1px solid var(--line)' : 'none',
                display: 'flex', flexDirection: 'column', justifyContent: 'center',
              }}>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text4)', marginBottom: 6 }}>{c.label}</div>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 24, fontWeight: 800, lineHeight: 1, color: c.color }}>{c.val}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>{c.unit}</div>
              </div>
            ))}
          </div>

          {/* Documents card */}
          <div className="card">
            <div className="card-label">Documents</div>
            {DOCS.map((doc, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 0',
                borderBottom: i < DOCS.length - 1 ? '1px solid var(--line)' : 'none',
                cursor: 'pointer',
              }}>
                <span className={`doc-badge ${doc.badge}`}>{doc.type}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="doc-n" style={{ marginBottom: 2 }}>{doc.name}</div>
                  <div className="doc-m">{doc.meta}</div>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--line2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              </div>
            ))}
          </div>

          {/* GingAI briefing card */}
          <div className="card card-g">
            <div className="card-label" style={{ color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 5 }}>
              <IconStar /> GingAI · Race Briefing
            </div>
            <div className="ai-body">
              10 knot SSW favors early commitment at mark 2 — teams tacking within 3 boat lengths gain ~12m on average.
              Based on R3 data, Brazil's tack timing was 5.2s behind the fleet median. At 10 kts with current wing
              configuration (80° cant), foil lift margin is tight — conservative gybe decisions recommended at the offset
              mark. Two open items from yesterday's debrief are directly relevant today:{' '}
              <strong style={{ color: 'var(--text)' }}>decision trigger for mark 2 tack</strong>, and{' '}
              <strong style={{ color: 'var(--text)' }}>comms protocol during the start sequence.</strong>
            </div>
          </div>
        </div>
      )}

      {/* ── FOCUS POINTS ── */}
      {tab === 'focus' && (
        <div className="pane on">
          {role.view === 'sailor' ? (
            <>
              <div style={{ marginBottom: 16, fontSize: 12, color: 'var(--text3)' }}>{role.name} · personal focus areas for today</div>
              {FOCUS_ATHLETE.map(fp => (
                <div className="fp-card" key={fp.n}>
                  <div className="fp-card-num">{fp.n}</div>
                  <div className="fp-card-body">
                    <div className="fp-card-title">{fp.t}</div>
                    <div className="fp-card-desc">{fp.d}</div>
                    {/* Data backing chip */}
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'var(--bg3)', border: '1px solid var(--line2)', borderRadius: 4, padding: '3px 8px', marginBottom: 6 }}>
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="2.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                      <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: '0.04em' }}>{fp.stat}</span>
                    </div>
                    <div className="fp-card-meta">
                      <span style={{ color: 'var(--text4)', fontWeight: 400, letterSpacing: 0 }}>→</span> {fp.m}
                    </div>
                  </div>
                </div>
              ))}
            </>
          ) : (
            <>
              <div style={{ marginBottom: 16, fontSize: 12, color: 'var(--text3)' }}>Team · focus areas per sailor today</div>
              {FOCUS_TEAM.map(sailor => (
                <div className="card" key={sailor.name} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <div className="s-ava" style={{ color: 'var(--green)', borderColor: 'var(--gb)', background: 'var(--gg)' }}>{sailor.init}</div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{sailor.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>{sailor.role}</div>
                    </div>
                  </div>
                  {sailor.points.map((p, i) => (
                    <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '7px 0', borderTop: '1px solid var(--line)' }}>
                      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 16, color: 'var(--yellow)', minWidth: 18, flexShrink: 0, lineHeight: 1.4 }}>{i + 1}</div>
                      <div style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.5 }}>{p}</div>
                    </div>
                  ))}
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* ── CHAT ── */}
      {tab === 'chat' && (
        <div className="pane on">
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div className="card-label" style={{ marginBottom: 0 }}>14:30 · Contextual Thread</div>
              <div style={{ fontSize: 11, color: 'var(--text4)' }}>4 messages</div>
            </div>
            {CHAT.map((m, i) => (
              <div key={i} style={{
                display: 'flex', gap: 12, padding: '14px 16px',
                borderBottom: i < CHAT.length - 1 ? '1px solid var(--line)' : 'none',
                background: m.ai ? 'var(--gg)' : 'transparent',
              }}>
                <div className="msg-ava" style={{ color: m.color, background: m.ai ? 'var(--bg2)' : undefined, borderColor: m.ai ? 'var(--gb)' : undefined, flexShrink: 0 }}>
                  {m.ai
                    ? <IconStar size={11} />
                    : m.init}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, marginBottom: 4 }}>
                    <span className="msg-who" style={{ color: m.ai ? 'var(--green)' : undefined }}>{m.name}</span>
                    <span className="msg-ts">{m.ts}</span>
                  </div>
                  <div className="msg-txt">{m.txt}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
