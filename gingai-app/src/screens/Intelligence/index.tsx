import { useState } from 'react';
import LeftNav from '../../components/LeftNav/LeftNav';
import { useRole } from '../../context/RoleContext';
import { IconWarn, IconStar, IconPlay } from '../../components/Icons';
import type { ScreenId } from '../../types';

interface Props {
  activeScreen: ScreenId;
  onNavigate: (s: ScreenId) => void;
}

const TOPICS = [
  { num: '01', name: 'Tack timing at Mark 2', pct: 94, ptColor: 'var(--red)',    score: 94,  pts: '+3.2 pts', sailors: '4 sailors', mm: true },
  { num: '02', name: 'Gybe communication',    pct: 71, ptColor: 'var(--yellow)', score: 71,  pts: '+2.1 pts', sailors: '3 sailors', mm: false },
  { num: '03', name: 'Flight stability — zone entry', pct: 58, ptColor: 'var(--green)', score: 58, pts: '+1.8 pts', sailors: '2 sailors', mm: false },
  { num: '04', name: 'Pre-start alignment',   pct: 44, ptColor: 'var(--text3)',  score: 44,  pts: '+1.2 pts', sailors: '2 sailors', mm: false },
  { num: '05', name: 'Wing config — downwind',pct: 32, ptColor: 'var(--text4)',  score: 32,  pts: '+0.8 pts', sailors: '1 sailor',  mm: false },
];

export default function Intelligence({ activeScreen, onNavigate }: Props) {
  const [activeTopic, setActiveTopic] = useState(0);
  const { role } = useRole();

  return (
    <div className="s-intel">
      <LeftNav activeScreen={activeScreen} onNavigate={onNavigate} />

      <div className="intel-left">
        <div className="il-top">
          <div className="il-title">Intelligence</div>
          <div className="synth-prog"><div className="synth-fill" /></div>
          <div className="synth-lbl">4/6 sailors synthesised · Post R5–R7</div>
        </div>
        <div className="t-list">
          {TOPICS.map((t, i) => (
            <div
              key={t.num}
              className={`t-row${activeTopic === i ? ' on' : ''}`}
              onClick={() => setActiveTopic(i)}
            >
              <div className="t-num">{t.num}</div>
              <div className="t-info">
                <div className="t-name">
                  {t.name}
                  {t.mm && (
                    <span style={{ color: 'var(--yellow)', fontSize: 11, marginLeft: 4 }}>
                      <IconWarn />
                    </span>
                  )}
                </div>
                <div className="t-bar-row">
                  <div className="t-bar-bg">
                    <div className="t-bar-fill" style={{ width: `${t.pct}%`, background: t.ptColor }} />
                  </div>
                  <div className="t-score" style={{ color: t.ptColor }}>{t.score}</div>
                </div>
                <div className="t-chips">
                  <div className="t-pts">{t.pts}</div>
                  <div className="t-sailors">{t.sailors}</div>
                  {t.mm && <div className="t-mm">mismatch</div>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="intel-right">
        <div className="ir-top">
          <div className="ir-eyebrow">Topic #1 · Highest Impact</div>
          <div className="ir-title">
            Tack timing at Mark 2
            <IconWarn size={16} />
          </div>
          <div className="ir-chips">
            <span className="chip chip-r">Impact 94</span>
            <span className="chip chip-g">+3.2 pts</span>
            <span className="chip chip-y">Effort: Medium</span>
          </div>
        </div>
        <div className="ir-scroll">
          {role.id === 'analyst' && (
            <div className="role-banner analyst" style={{ marginBottom: 20, borderRadius: 3 }}>
              <IconStar /> Analyst view — full data + root cause enabled
            </div>
          )}

          <div className="mm-section">
            <div className="mm-head">
              <IconWarn />
              Perception Mismatch — 2 sailors, opposite reads
            </div>
            <div className="mm-q"><strong>Rasmus:</strong> "We committed too late — I was waiting for a call that never came"</div>
            <div className="mm-q"><strong>Tom:</strong> "The call was on time — it was a boat speed issue, not timing"</div>
            <div className="mm-note">Surface this before showing data. Same event, two different mental models — EDGE scenario.</div>
          </div>

          <div className="d-section">
            <div className="sec-title" style={{ color: 'var(--text3)', marginBottom: 14 }}>Data Evidence — Oracle Telemetry R5</div>
            <div className="d-stats">
              <div><div className="d-val" style={{ color: 'var(--red)' }}>-8.3%</div><div className="d-lbl">VMG loss at mark 2</div></div>
              <div><div className="d-val" style={{ color: 'var(--yellow)' }}>23s</div><div className="d-lbl">Tack duration (target: 18s)</div></div>
              <div><div className="d-val" style={{ color: 'var(--red)' }}>3 BL</div><div className="d-lbl">Lost vs fleet median</div></div>
            </div>
            <div className="vid-row">
              <div className="vid-play"><IconPlay /></div>
              <div>
                <div className="vid-name">Mark 2 tack — Race 5 · VMG overlay · auto-clipped</div>
                <div className="vid-dur">0:34</div>
              </div>
            </div>
          </div>

          <div className="q-section">
            <div className="sec-title" style={{ color: 'var(--text3)', marginBottom: 14 }}>Sailor Inputs — 4/6 captured</div>
            <div className="q-grid">
              {[
                { i: 'R', n: 'Rasmus', r: 'Flight Controller', q: '"Waited for a call. Had the angle. Nobody owns this decision clearly."', hl: true },
                { i: 'T', n: 'Tom',    r: 'Wing Trimmer',      q: '"Call was on time. Speed was already lost from the gate."', hl: true },
                { i: 'A', n: 'Ana',    r: 'Grinder',           q: '"Felt the hesitation. Agree with Rasmus — someone needed to commit."' },
                { i: 'B', n: 'Bruno',  r: 'Grinder',           q: '"Speed was already down from the gate. Maybe two separate problems."' },
              ].map(s => (
                <div key={s.n} className="q-card" style={s.hl ? { borderTopColor: 'var(--yellow)' } : undefined}>
                  <div className="q-who">
                    <div className="q-ava">{s.i}</div>
                    <div><div className="q-name">{s.n}</div><div className="q-role">{s.r}</div></div>
                  </div>
                  <div className="q-txt">{s.q}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="hyp-section">
            <div className="hyp-head"><IconStar /> GingAI · 5 Whys Root Cause</div>
            <div className="hyp-txt">
              If <em>the decision rule for tack trigger at mark 2 is not explicitly assigned to one person</em>, then{' '}
              <em>Rasmus and Tom each wait for the other to call</em>, because{' '}
              <em>the existing protocol doesn't define who has authority in marginal conditions — creating shared ambiguity that resolves as collective hesitation.</em>
            </div>
          </div>

          <div className="sec-title" style={{ marginTop: 20, marginBottom: 10 }}>Suggested Actions</div>
          <div className="act-row">
            <div className="act-chk" />
            <div>
              <div className="act-txt">Define tack trigger: "Rasmus calls within 3 BL — no confirmation needed"</div>
              <div className="act-meta">→ Golden Rule · Owner: Rasmus</div>
            </div>
          </div>
          <div className="act-row">
            <div className="act-chk" />
            <div>
              <div className="act-txt">Simulator scenario: replicate R5 mark 2 — test new rule</div>
              <div className="act-meta">→ Next sim brief · Owner: Marco</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
