import { useRole } from '../../../context/RoleContext';

const SAILORS = [
  { name: 'Rasmus', focus: 'Tack timing · Flight stability · Offset call' },
  { name: 'Tom',    focus: 'Wing trim · Start sequence comms' },
  { name: 'Ana',    focus: 'Grinder load · Foil transitions' },
  { name: 'Bruno',  focus: 'Port gybe timing' },
  { name: 'Felipe', focus: 'Bow work · Mark 2 approach' },
  { name: 'Lucas',  focus: 'Start line bias · Pre-start positioning' },
];

export default function Block1818() {
  const { role } = useRole();

  return (
    <>
      <div className="main-top">
        <div className="eyebrow">18:18 · Phase 2 — Capture · Activates at dock-in</div>
        <div className="page-title">
          R7 → Capture Opens <span className="ptag ptag-r">Capture</span>
        </div>
      </div>
      <div className="gen-panel">
        <div className="ai-body" style={{ marginBottom: 28, paddingBottom: 24, borderBottom: '1px solid var(--line)' }}>
          Capture activates automatically when the team docks in after R7. Each sailor receives an AI voice interview
          prompt on their phone. The AI will guide a 5–8 min structured reflection using the 5 Whys method. Results
          are synthesised in real-time as sailors complete their captures.
        </div>
        <div className="sec-title">Sailor Status</div>
        {SAILORS.map(s => (
          <div className="past-action-row" key={s.name}>
            <div className="pa-dot" style={{ background: 'var(--line2)' }} />
            <div>
              <div className="pa-txt" style={role.id === 'athlete' && s.name === 'Rasmus' ? { color: 'var(--text)' } : undefined}>
                {s.name}{role.id === 'athlete' && s.name === 'Rasmus' ? ' (You)' : ''} — Waiting for dock-in
              </div>
              <div className="pa-meta">Focus: {s.focus}</div>
            </div>
          </div>
        ))}
        <div className="sec-title" style={{ marginTop: 24 }}>Pre-loaded Context</div>
        <div className="ai-body">
          GingAI will enter the capture with today's focus areas pre-loaded. Opening question will be anchored to
          each sailor's individual brief. AI will cross-reference responses with Oracle telemetry in real-time.
        </div>
      </div>
    </>
  );
}
