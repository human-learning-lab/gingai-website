export default function StatusRail() {
  const team = [
    { init: 'MG', name: 'Martine', state: 'At tent',  dot: 'sd-g' },
    { init: 'RK', name: 'Rasmus',  state: 'At tent',  dot: 'sd-g' },
    { init: 'PS', name: 'Pietro',  state: 'At tent',  dot: 'sd-g' },
    { init: 'PG', name: 'Paul G.', state: 'En route', dot: 'sd-y', stateColor: 'var(--yellow)' },
    { init: 'MI', name: 'Mateus',  state: 'At tent',  dot: 'sd-g' },
    { init: 'MC', name: 'Marco',   state: 'At tent',  dot: 'sd-g' },
  ];

  const actions = [
    { color: 'var(--red)',    title: 'Mark 2 tack trigger rule',    meta: 'Rasmus · from R3' },
    { color: 'var(--yellow)', title: 'Comms during start sequence', meta: 'Pietro · from R4' },
    { color: 'var(--green)',  title: 'Wing cant SOP <12 kts',       meta: 'Mateus · due today', last: true },
  ];

  return (
    <div className="srl">
      <div className="srl-sec">
        <div className="srl-lbl">Team</div>
        {team.map(m => (
          <div className="s-row" key={m.name}>
            <div className="s-ava">
              {m.init}
              <div className={`sdot ${m.dot}`} />
            </div>
            <div>
              <div className="s-name">{m.name}</div>
              <div className="s-state" style={m.stateColor ? { color: m.stateColor } : undefined}>{m.state}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="srl-sec">
        <div className="srl-lbl">Next Up</div>
        <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 3 }}>15:00 · in 36 min</div>
        <div style={{ fontSize: 14, fontWeight: 500 }}>Warm Up</div>
      </div>
      <div className="srl-sec">
        <div className="srl-lbl">Open Items</div>
        {actions.map((a, i) => (
          <div className="ac-row" key={i} style={a.last ? { borderBottom: 'none' } : undefined}>
            <div className="ac-title">
              <span className="ac-dot" style={{ background: a.color }} />
              {a.title}
            </div>
            <div className="ac-meta">{a.meta}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
