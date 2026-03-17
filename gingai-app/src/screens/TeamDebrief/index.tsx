import { useState } from 'react';
import LeftNav from '../../components/LeftNav/LeftNav';
import { useRole } from '../../context/RoleContext';
import { IconWarn, IconStar, IconPin, IconPlay, IconDot, IconCheck } from '../../components/Icons';
import type { ScreenId } from '../../types';

interface Props {
  activeScreen: ScreenId;
  onNavigate: (s: ScreenId) => void;
}

type Stage = 0 | 1 | 2 | 3;
const STAGE_LABELS = ['Facts Found', 'Discussion', 'Actions', 'Expected Outcomes'];

const TEAM_MEMBERS = ['Rasmus', 'Pietro', 'Mateus', 'Marco', 'Martine', 'Paul G.'];

const AGENDA_ITEMS = [
  { n: '1', l: 'Tack M2' },
  { n: '2', l: 'Gybe Comms' },
  { n: '3', l: 'Flight Zone' },
  { n: '4', l: 'Pre-Start' },
  { n: '5', l: 'Wing Config' },
];

export default function TeamDebrief({ activeScreen, onNavigate }: Props) {
  const { role } = useRole();
  const isCoach = role.id === 'coach';

  const [currentStage, setCurrentStage] = useState<Stage>(0);
  const [currentTopic, setCurrentTopic] = useState(0);
  const [actionText, setActionText] = useState('');
  const [actionOwner, setActionOwner] = useState('');
  const [assignedActions, setAssignedActions] = useState<{ text: string; owner: string }[]>([
    { text: 'Rasmus calls within 3 BL — no confirmation needed', owner: 'Rasmus' },
  ]);

  const canAdvanceStage = currentStage < 3;
  const canNextTopic = currentStage >= 2 && assignedActions.length > 0;

  function advanceStage() {
    if (canAdvanceStage) setCurrentStage(s => (s + 1) as Stage);
  }

  function addAction() {
    if (!actionText.trim() || !actionOwner) return;
    setAssignedActions(prev => [...prev, { text: actionText, owner: actionOwner }]);
    setActionText('');
    setActionOwner('');
  }

  function nextTopic() {
    if (!canNextTopic) return;
    setCurrentTopic(prev => Math.min(prev + 1, AGENDA_ITEMS.length - 1));
    setCurrentStage(0);
    setAssignedActions([]);
  }

  return (
    <div className="s-debrief">
      <LeftNav activeScreen={activeScreen} onNavigate={onNavigate} />

      <div className="db-wrap">
        {/* Top bar */}
        <div className="db-topbar">
          <div>
            <div className="db-ttl">Team Debrief <span className="sub">· Post R5/R6/R7</span></div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>6 sailors · Coach: Paul Brotherson</div>
          </div>
          <div className="agt">
            {AGENDA_ITEMS.map((item, i) => (
              <div key={item.n} style={{ display: 'flex', alignItems: 'center' }}>
                <div className={`ag-s${i === currentTopic ? ' now' : ''}`}>
                  <div className={`ag-d${i < currentTopic ? ' done' : i === currentTopic ? ' now' : ''}`}>
                    {i < currentTopic ? '✓' : item.n}
                  </div>
                  <div className="ag-l">{item.l}</div>
                </div>
                {i < AGENDA_ITEMS.length - 1 && <div className="ag-ln" />}
              </div>
            ))}
          </div>
          {isCoach && (
            <div className="db-btns">
              <button className="db-btn rec"><IconDot /> 12:34</button>
              <button className="db-btn">Pause</button>
              <button
                className={`db-btn go${!canNextTopic ? ' disabled' : ''}`}
                onClick={nextTopic}
                disabled={!canNextTopic}
                title={!canNextTopic ? 'Assign at least one action before advancing' : 'Move to next topic'}
              >
                Next Topic
              </button>
            </div>
          )}
        </div>

        {/* 4-Stage Flow Bar */}
        <div className="stage-flow">
          {STAGE_LABELS.map((label, i) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              {i > 0 && (
                <div className="stage-connector" style={{ background: i <= currentStage ? 'var(--green)' : 'var(--line2)' }} />
              )}
              <div
                className={`stage-step${i < currentStage ? ' done' : i === currentStage ? ' active' : ''}`}
                style={{ cursor: isCoach && i === currentStage && canAdvanceStage ? 'pointer' : 'default' }}
                onClick={() => isCoach && i === currentStage && advanceStage()}
                title={isCoach && i === currentStage && canAdvanceStage ? `Advance to "${STAGE_LABELS[i + 1]}"` : undefined}
              >
                <div className="stage-dot">
                  {i < currentStage ? '✓' : i + 1}
                </div>
                <div className="stage-label">{label}</div>
              </div>
            </div>
          ))}
          {isCoach && currentStage < 3 && (
            <button
              className="db-btn go"
              style={{ marginLeft: 16, flexShrink: 0, height: 26, fontSize: 11 }}
              onClick={advanceStage}
            >
              → Next Stage
            </button>
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
              <div className="db-big-n">{currentTopic + 1}</div>
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

            {/* Stage 0: Facts Found */}
            {currentStage >= 0 && (
              <div className="db-section">
                <div className="db-sec-lbl" style={{ color: currentStage === 0 ? 'var(--navy)' : 'var(--text3)' }}>
                  Stage 1 · Facts Found
                </div>
                <div className="db-sec-lbl" style={{ color: 'var(--yellow)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <IconWarn /> 2 sailors saw this differently
                </div>
                <div className="mm-q" style={{ marginBottom: 8 }}><strong>Rasmus:</strong> "Committed too late — was waiting for the call"</div>
                <div className="mm-q" style={{ marginBottom: 10 }}><strong>Pietro:</strong> "Call was on time — it was a boat speed issue"</div>
                <div className="mm-note">Surface to the group before data. Who else agrees with each read?</div>
              </div>
            )}

            {/* Stage 1+: Discussion */}
            {currentStage >= 1 && (
              <div className="db-section">
                <div className="db-sec-lbl" style={{ color: currentStage === 1 ? 'var(--navy)' : 'var(--text3)' }}>
                  Stage 2 · Discussion — Race Data & All Inputs
                </div>
                <div className="d-stats" style={{ marginBottom: 14 }}>
                  <div><div className="d-val" style={{ color: 'var(--red)' }}>-8.3%</div><div className="d-lbl">VMG loss</div></div>
                  <div><div className="d-val" style={{ color: 'var(--yellow)' }}>+5.2s</div><div className="d-lbl">Behind tack target</div></div>
                  <div><div className="d-val" style={{ color: 'var(--red)' }}>#4→#7</div><div className="d-lbl">Position after mark</div></div>
                </div>
                <div className="vid-row">
                  <div className="vid-play"><IconPlay /></div>
                  <div>
                    <div className="vid-name">Mark 2 tack — R5 · VMG overlay</div>
                    <div className="vid-dur">0:34</div>
                  </div>
                </div>
                <div className="q-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginTop: 14 }}>
                  {[
                    { i: 'R', n: 'Rasmus',  r: 'Flight Controller', q: '"Waited for a call. Had the angle. Nobody owns this clearly."', hl: true },
                    { i: 'P', n: 'Pietro',  r: 'Wing Trimmer',      q: '"Call was on time. Speed already lost from the gate."', hl: true },
                    { i: 'Mt', n: 'Mateus', r: 'Grinder G1',        q: '"Felt the hesitation. Needed someone to commit."' },
                    { i: 'Mc', n: 'Marco',  r: 'Grinder G2',        q: '"Speed was already down. Maybe two problems."' },
                    { i: 'Ma', n: 'Martine',r: 'Helm',              q: 'Capture pending…', pending: true },
                    { i: 'PG', n: 'Paul G.',r: 'Strategist',        q: 'Capture pending…', pending: true },
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
            )}

            {/* Stage 2+: Actions */}
            {currentStage >= 2 && (
              <div className="db-section">
                <div className="db-sec-lbl" style={{ color: currentStage === 2 ? 'var(--navy)' : 'var(--text3)' }}>
                  Stage 3 · Actions
                </div>
                <div className="hyp-head" style={{ marginBottom: 10 }}>
                  <IconStar /> GingAI · Root Cause
                </div>
                <div className="hyp-txt" style={{ marginBottom: 16 }}>
                  If <em>the ownership of the tack decision is not assigned to one person</em>, then{' '}
                  <em>both Rasmus and Pietro defer to each other</em>, because{' '}
                  <em>the protocol doesn't define who holds authority in marginal conditions.</em>
                </div>
                {assignedActions.map((a, i) => (
                  <div key={i} className="dba-row">
                    <div className="dba-chk done"><IconCheck /></div>
                    <div>
                      <div className="dba-txt">{a.text}</div>
                      <div className="dba-meta">Owner: {a.owner}</div>
                    </div>
                  </div>
                ))}
                {isCoach && (
                  <div className="action-gate">
                    <div className="action-gate-label">Assign Action — required before next topic</div>
                    <div className="action-gate-row">
                      <textarea
                        className="action-gate-input"
                        rows={2}
                        placeholder="Describe the action…"
                        value={actionText}
                        onChange={e => setActionText(e.target.value)}
                      />
                      <select
                        className="action-gate-select"
                        value={actionOwner}
                        onChange={e => setActionOwner(e.target.value)}
                      >
                        <option value="">Owner…</option>
                        {TEAM_MEMBERS.map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                      <button
                        className="action-gate-btn"
                        onClick={addAction}
                        disabled={!actionText.trim() || !actionOwner}
                      >
                        + Add
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Stage 3: Expected Outcomes */}
            {currentStage >= 3 && (
              <div className="db-section">
                <div className="db-sec-lbl" style={{ color: 'var(--navy)' }}>
                  Stage 4 · Expected Outcomes
                </div>
                <div style={{ display: 'flex', gap: 24, marginBottom: 12, flexWrap: 'wrap' }}>
                  <div>
                    <div className="d-lbl" style={{ marginBottom: 4 }}>What should this solve?</div>
                    <div style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.6 }}>
                      Eliminate hesitation at mark 2 in marginal conditions. One voice, one call, no ambiguity.
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div className="d-lbl">Confidence:</div>
                  {(['Low', 'Medium', 'High'] as const).map(lvl => (
                    <span key={lvl} className={`chip ${lvl === 'High' ? 'chip-g' : lvl === 'Medium' ? 'chip-y' : 'chip-r'}`}>
                      {lvl}
                    </span>
                  ))}
                </div>
                <div style={{ marginTop: 12, fontSize: 13, color: 'var(--text3)', lineHeight: 1.6 }}>
                  How will we know it worked? → Rasmus calls cleanly in next simulator session. Zero hesitation events in next race.
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="db-side">
            <div className="dbs-sec">
              <div className="dbs-lbl">Actions Assigned</div>
              {assignedActions.map((a, i) => (
                <div key={i} className="dba-row">
                  <div className="dba-chk done"><IconCheck /></div>
                  <div>
                    <div className="dba-txt">{a.text}</div>
                    <div className="dba-meta">Owner: {a.owner}</div>
                  </div>
                </div>
              ))}
              {assignedActions.length === 0 && (
                <div style={{ fontSize: 12, color: 'var(--text4)', padding: '4px 0' }}>
                  No actions yet — required before next topic
                </div>
              )}
            </div>
            <div className="dbs-sec">
              <div className="dbs-lbl">Next</div>
              {[
                { n: 2, nm: 'Gybe communication', p: '+2.1 pts · Low effort' },
                { n: 3, nm: 'Flight stability',   p: '+1.8 pts · High effort' },
                { n: 4, nm: 'Pre-start alignment', p: '+1.2 pts', dim: true },
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
                { i: 'P', pct: 60, color: 'var(--yellow)' },
                { i: 'Mt', pct: 72, color: 'var(--green)' },
                { i: 'Mc', pct: 48, color: 'var(--text3)' },
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
