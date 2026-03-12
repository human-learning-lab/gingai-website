import { useState } from 'react';
import { useRole } from '../../../context/RoleContext';
import { IconStar } from '../../../components/Icons';

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
        <div className={`tab${tab === 'briefing' ? ' on' : ''}`} onClick={() => setTab('briefing')}>
          Briefing Pack
        </div>
        <div className={`tab${tab === 'focus' ? ' on' : ''}`} onClick={() => setTab('focus')}>
          {role.id === 'athlete' ? 'My Focus Points' : 'Focus Points'}
        </div>
        <div className={`tab${tab === 'chat' ? ' on' : ''}`} onClick={() => setTab('chat')}>
          Chat <span style={{ color: 'var(--green)', marginLeft: 3, fontSize: 10 }}>3</span>
        </div>
      </div>

      {tab === 'briefing' && (
        <div className="pane on">
          <div className="conds">
            <div className="cond">
              <div className="cond-n">10–12<span className="cond-u"> kts</span></div>
              <div className="cond-l">Wind Speed</div>
            </div>
            <div className="cond">
              <div className="cond-n" style={{ color: 'var(--text2)' }}>SSW</div>
              <div className="cond-l">Direction</div>
            </div>
            <div className="cond">
              <div className="cond-n" style={{ color: 'var(--yellow)' }}>Course 2</div>
              <div className="cond-l">Olympic · Mark A upwind</div>
            </div>
          </div>
          <div className="sec-title">Documents</div>
          {[
            { name: 'São Paulo — Race Analysis R1–R4', meta: 'Updated 2h ago · 14 pages', type: 'Data' },
            { name: 'Team Golden Rules — Current Season', meta: '12 active rules', type: 'Memory' },
            { name: 'Video — Mark 2 Tack Comparison (R3 vs Fleet)', meta: '2:34 · Auto-clipped', type: 'Video' },
            { name: 'Open Action Items — R3/R4 Debrief', meta: '4 open · 2 done', type: 'Actions' },
          ].map(doc => (
            <div className="doc-row" key={doc.name}>
              <div className="doc-n">{doc.name}</div>
              <div className="doc-m">{doc.meta}</div>
              <div className="doc-t">{doc.type}</div>
            </div>
          ))}
          <div className="ai-sum">
            <div className="ai-label"><IconStar /> GingAI</div>
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

      {tab === 'focus' && (
        <div className="pane on">
          {role.id === 'athlete' ? (
            <>
              <div className="sec-title" style={{ marginBottom: 0 }}>Rasmus — 3 Focus Points for Today</div>
              {[
                { n: 1, t: 'Tack at Mark 2 — commit early, own the call', d: "Trigger within 3 BL of the mark. Your read to own — don't wait for a secondary signal. Based on yesterday's -8.3% VMG loss.", m: 'Target: <15s tack duration · Rule #7' },
                { n: 2, t: 'Flight stability entering the zone', d: 'R4 showed 3 foil touchdowns in the pre-start zone. Height management 200m before the line. Smooth rudder — no jerky corrections.', m: 'Watch: Rudder aggression index' },
                { n: 3, t: 'Gybe call at offset — read fleet first', d: '10 kts = marginal gybe lift. Read fleet proximity before committing. "Hold" or "Go" — two options only.', m: 'Signal: "Hold" / "Go" on comms · Rule #11' },
              ].map(fp => (
                <div className="fp" key={fp.n}>
                  <div className="fp-n">{fp.n}</div>
                  <div>
                    <div className="fp-t">{fp.t}</div>
                    <div className="fp-d">{fp.d}</div>
                    <div className="fp-m">{fp.m}</div>
                  </div>
                </div>
              ))}
            </>
          ) : (
            <>
              <div className="sec-title" style={{ marginBottom: 16 }}>Team Focus Points — Today</div>
              {[
                { name: 'Rasmus', role: 'Flight Controller', points: ['Tack at Mark 2 — commit within 3 BL', 'Flight stability entering the zone', 'Gybe call at offset — read fleet first'] },
                { name: 'Tom', role: 'Wing Trimmer', points: ['Wing cant at 78–80° · marginal lift conditions', 'Start sequence comms — two-word calls only'] },
                { name: 'Ana', role: 'Grinder', points: ['Grinder load management · foil transitions', 'Support Rasmus on flight height cues'] },
              ].map(sailor => (
                <div key={sailor.name} style={{ marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid var(--line)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <div className="msg-ava" style={{ color: 'var(--green)' }}>{sailor.name[0]}</div>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: 14 }}>{sailor.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>{sailor.role}</div>
                    </div>
                  </div>
                  {sailor.points.map((p, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, padding: '6px 0', borderBottom: i < sailor.points.length - 1 ? '1px solid var(--line)' : 'none' }}>
                      <div style={{ color: 'var(--yellow)', fontSize: 14, fontFamily: 'Barlow Condensed', fontWeight: 800, minWidth: 18 }}>{i + 1}</div>
                      <div style={{ fontSize: 14, color: 'var(--text2)' }}>{p}</div>
                    </div>
                  ))}
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {tab === 'chat' && (
        <div className="pane on">
          <div className="sec-title">14:30 Block — Contextual Thread</div>
          {[
            { ava: 'C', who: 'Coach Marco', ts: '13:58', txt: 'Briefing pack is live. Wind reading 9.8–11.2 at the course, SSW, consistent. Read the mark 2 tack analysis before we start.', ai: false, color: 'var(--text2)' },
            { ava: <IconStar />, who: 'GingAI', ts: '14:02', txt: 'Oracle telemetry + wind data: 10 kts SSW matches the marginal flight window for the Brazil F50. Recommend wing cant at 78–80° for max stability. The tack at mark 2 in similar conditions (R1, Bermuda Day 2) cost 11.3m.', ai: true, color: 'var(--green)' },
            { ava: 'R', who: 'Rasmus', ts: '14:18', txt: 'Good call on the cant. I want to settle who calls the gybe at the offset today before we go on the water.', ai: false, color: 'var(--green)' },
            { ava: 'T', who: 'Tom', ts: '14:21', txt: 'Rasmus owns the offset call. I\'ll handle mark 2 tack. 3 BL = go, no confirmation?', ai: false, color: 'var(--yellow)' },
          ].map((m, i) => (
            <div key={i} className={`msg${m.ai ? ' msg-ai' : ''}`}>
              <div className="msg-ava" style={{ color: m.color, background: m.ai ? 'var(--gg)' : undefined, borderColor: m.ai ? 'var(--gb)' : undefined }}>
                {m.ava}
              </div>
              <div>
                <div className="msg-who">{m.who} <span className="msg-ts">{m.ts}</span></div>
                <div className="msg-txt">{m.txt}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
