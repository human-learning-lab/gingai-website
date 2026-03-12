import LeftNav from '../../components/LeftNav/LeftNav';
import { useRole } from '../../context/RoleContext';
import { IconWarn, IconStar, IconPin, IconPlay, IconDot, IconCheck } from '../../components/Icons';
import type { ScreenId } from '../../types';

interface Props {
  activeScreen: ScreenId;
  onNavigate: (s: ScreenId) => void;
}

export default function TeamDebrief({ activeScreen, onNavigate }: Props) {
  const { role } = useRole();
  const isCoach = role.id === 'coach';

  return (
    <div className="s-debrief">
      <LeftNav activeScreen={activeScreen} onNavigate={onNavigate} />

      <div className="db-wrap">
        {/* Top bar */}
        <div className="db-topbar">
          <div>
            <div className="db-ttl">Team Debrief <span className="sub">· Post R5/R6/R7</span></div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>6/6 sailors · Coach: Marco</div>
          </div>
          <div className="agt">
            {[
              { n: '1', l: 'Tack M2',    state: 'now' },
              { n: '2', l: 'Gybe Comms', state: '' },
              { n: '3', l: 'Flight Zone',state: '' },
              { n: '4', l: 'Pre-Start',  state: '' },
              { n: '5', l: 'Wing Config',state: '' },
            ].map((item, i) => (
              <>
                <div key={item.n} className={`ag-s${item.state === 'now' ? ' now' : ''}`}>
                  <div className={`ag-d${item.state === 'done' ? ' done' : item.state === 'now' ? ' now' : ''}`}>{item.n}</div>
                  <div className="ag-l">{item.l}</div>
                </div>
                {i < 4 && <div className="ag-ln" />}
              </>
            ))}
          </div>
          {isCoach && (
            <div className="db-btns">
              <button className="db-btn rec"><IconDot /> 12:34</button>
              <button className="db-btn">Pause</button>
              <button className="db-btn go">Mark Done</button>
              <button className="db-btn">Next</button>
            </div>
          )}
        </div>

        <div className="db-body">
          <div className="db-main">
            {!isCoach && role.id === 'analyst' && (
              <div className="role-banner analyst" style={{ marginBottom: 20, borderRadius: 3 }}>
                <IconStar /> Analyst view — full data visible. Debrief controlled by Coach.
              </div>
            )}

            <div className="db-topic-hero">
              <div className="db-big-n">1</div>
              <div className="db-topic-head">
                <div className="db-topic-title">TACK TIMING AT MARK 2</div>
                <div className="db-chips">
                  <span className="chip chip-r">Impact 94</span>
                  <span className="chip chip-g">+3.2 pts</span>
                  <span className="chip chip-y">Effort: Medium</span>
                  <span className="chip chip-y"><IconWarn /> Mismatch</span>
                </div>
              </div>
            </div>

            <div className="db-section">
              <div className="db-sec-lbl" style={{ color: 'var(--yellow)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <IconWarn /> Start here — 2 sailors saw this differently
              </div>
              <div className="mm-q" style={{ marginBottom: 8 }}><strong>Rasmus:</strong> "Committed too late — was waiting for the call"</div>
              <div className="mm-q" style={{ marginBottom: 10 }}><strong>Tom:</strong> "Call was on time — it was a boat speed issue"</div>
              <div className="mm-note">Surface to the group before data. Who else agrees with each read?</div>
            </div>

            <div className="db-section">
              <div className="db-sec-lbl" style={{ color: 'var(--text3)' }}>Race Data — Oracle R5</div>
              <div className="d-stats" style={{ marginBottom: 14 }}>
                <div><div className="d-val" style={{ color: 'var(--red)' }}>-8.3%</div><div className="d-lbl">VMG loss</div></div>
                <div><div className="d-val" style={{ color: 'var(--yellow)' }}>+5.2s</div><div className="d-lbl">Behind tack target</div></div>
                <div><div className="d-val" style={{ color: 'var(--red)' }}>#4→#7</div><div className="d-lbl">Position after mark</div></div>
              </div>
              <div className="vid-row">
                <div className="vid-play"><IconPlay /></div>
                <div>
                  <div className="vid-name">Mark 2 tack — R5 · VMG overlay · Tap to play</div>
                  <div className="vid-dur">0:34</div>
                </div>
              </div>
            </div>

            <div className="db-section">
              <div className="db-sec-lbl" style={{ color: 'var(--text3)' }}>All Sailor Inputs</div>
              <div className="q-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
                {[
                  { i: 'R', n: 'Rasmus', r: 'Flight Controller', q: '"Waited for a call. Had the angle. Nobody owns this clearly."', hl: true },
                  { i: 'T', n: 'Tom',    r: 'Wing Trimmer',      q: '"Call was on time. Speed was already lost from the gate."', hl: true },
                  { i: 'A', n: 'Ana',    r: 'Grinder',           q: '"Felt the hesitation. Needed someone to commit. Agree with Rasmus."' },
                  { i: 'B', n: 'Bruno',  r: 'Grinder',           q: '"Speed was already down from the gate. Maybe two problems."' },
                  { i: 'F', n: 'Felipe', r: 'Bowman',            q: 'Capture pending…', pending: true },
                  { i: 'L', n: 'Lucas',  r: 'Helmsman',          q: 'Capture pending…', pending: true },
                ].map(s => (
                  <div key={s.n} className="q-card" style={{ borderTopColor: s.hl ? 'var(--yellow)' : undefined, opacity: s.pending ? 0.35 : 1 }}>
                    <div className="q-who">
                      <div className="q-ava">{s.i}</div>
                      <div><div className="q-name">{s.n}</div><div className="q-role">{s.r}</div></div>
                    </div>
                    <div className="q-txt" style={s.pending ? { color: 'var(--text3)', fontStyle: 'normal' } : undefined}>{s.q}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="db-section">
              <div className="hyp-head" style={{ marginBottom: 10 }}>
                <IconStar /> GingAI · Root Cause
              </div>
              <div className="hyp-txt">
                If <em>the ownership of the tack decision is not assigned to one person</em>, then{' '}
                <em>both Rasmus and Tom defer to each other</em>, because{' '}
                <em>the protocol doesn't define who holds authority in marginal conditions — shared ambiguity that resolves as collective hesitation.</em>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="db-side">
            <div className="dbs-sec">
              <div className="dbs-lbl">Actions</div>
              <div className="dba-row">
                <div className="dba-chk done"><IconCheck /></div>
                <div>
                  <div className="dba-txt">Rasmus calls within 3 BL — no confirmation needed</div>
                  <div className="dba-meta">Golden Rule · Rasmus</div>
                </div>
              </div>
              {isCoach && (
                <div style={{ padding: '8px 0' }}>
                  <div style={{ padding: 8, background: 'var(--bg3)', borderRadius: 3, border: '1px dashed var(--line2)', textAlign: 'center', cursor: 'pointer', color: 'var(--text3)', fontSize: 12 }}>
                    + Add action
                  </div>
                </div>
              )}
            </div>
            <div className="dbs-sec">
              <div className="dbs-lbl">Next</div>
              {[
                { n: 2, nm: 'Gybe communication', p: '+2.1 pts · Low effort' },
                { n: 3, nm: 'Flight stability',   p: '+1.8 pts · High effort' },
                { n: 4, nm: 'Pre-start alignment',p: '+1.2 pts', dim: true },
              ].map(item => (
                <div key={item.n} className="nt-row" style={item.dim ? { opacity: 0.4 } : undefined}>
                  <div className="nt-n">{item.n}</div>
                  <div><div className="nt-nm">{item.nm}</div><div className="nt-p">{item.p}</div></div>
                </div>
              ))}
            </div>
            <div className="dbs-sec">
              <div className="dbs-lbl">Golden Rules</div>
              {[
                { txt: 'At <12 kts: tack at windward mark is individual — no collective signal.', src: 'Rule #7 · R3' },
                { txt: 'Gybe call: read fleet first. "Hold" or "Go" only.', src: 'Rule #11 · R4' },
              ].map((r, i) => (
                <div key={i} className="gr-row">
                  <div className="gr-pin"><IconPin /></div>
                  <div><div className="gr-txt">{r.txt}</div><div className="gr-src">{r.src}</div></div>
                </div>
              ))}
              {isCoach && (
                <div style={{ padding: '8px 0' }}>
                  <div style={{ fontSize: 12, cursor: 'pointer', color: 'var(--green)' }}>Promote to rule</div>
                </div>
              )}
            </div>
            <div className="dbs-sec">
              <div className="dbs-lbl">Engagement</div>
              {[
                { i: 'R', pct: 85, color: 'var(--green)' },
                { i: 'T', pct: 60, color: 'var(--yellow)' },
                { i: 'A', pct: 72, color: 'var(--green)' },
                { i: 'B', pct: 48, color: 'var(--text3)' },
              ].map(eg => (
                <div key={eg.i} className="eg-row">
                  <div className="eg-ava">{eg.i}</div>
                  <div className="eg-bar"><div className="eg-fill" style={{ width: `${eg.pct}%`, background: eg.color }} /></div>
                  <div className="eg-p">{eg.pct}%</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
