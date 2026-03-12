export default function Block1330() {
  return (
    <>
      <div className="main-top">
        <div className="eyebrow">13:30 · Past · Phase 5 — Learn</div>
        <div className="page-title" style={{ opacity: 0.6 }}>Debrief &amp; Sim Brief</div>
      </div>
      <div className="gen-panel">
        <div className="sec-title">GingAI Debrief Summary</div>
        <div className="ai-body" style={{ marginBottom: 28, paddingBottom: 24, borderBottom: '1px solid var(--line)' }}>
          3 topics discussed. Agenda was pre-ranked from R1–R4 capture data. The team moved through all items in
          38 minutes — 12 min faster than the R3/R4 debrief. 4 action items logged, 2 promoted directly to Golden Rules.
        </div>
        <div className="sec-title">Action Items Logged</div>
        {[
          { color: 'var(--green)', txt: 'Define tack trigger at mark 2 — ownership to Rasmus', meta: 'Logged 13:44 · Owner: Rasmus · Due: today' },
          { color: 'var(--green)', txt: 'Comms protocol during start sequence — two-word calls only', meta: 'Logged 13:51 · Owner: Tom · Due: today' },
          { color: 'var(--yellow)', txt: 'Update wing cant SOP for <12 kts conditions', meta: 'Logged 13:58 · Owner: Ana · Due: this week' },
          { color: 'var(--yellow)', txt: 'Simulator scenario: replicate R4 pre-start zone entry', meta: 'Logged 14:02 · Owner: Marco · Due: 14:00 sim session', last: true },
        ].map((a, i) => (
          <div className="past-action-row" key={i} style={a.last ? { borderBottom: 'none' } : undefined}>
            <div className="pa-dot" style={{ background: a.color }} />
            <div>
              <div className="pa-txt">{a.txt}</div>
              <div className="pa-meta">{a.meta}</div>
            </div>
          </div>
        ))}
        <div className="sec-title" style={{ marginTop: 24 }}>Golden Rules Promoted</div>
        <div className="ai-body">
          Rule #11 — "Gybe call at offset: read fleet first. 'Hold' or 'Go' — two options only." was promoted from
          this session's discussion. Now active in the briefing library.
        </div>
      </div>
    </>
  );
}
