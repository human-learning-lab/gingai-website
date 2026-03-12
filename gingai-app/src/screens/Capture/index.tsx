import { useState, useEffect } from 'react';
import { useRole } from '../../context/RoleContext';
import { IconStar, IconStop } from '../../components/Icons';
import LeftNav from '../../components/LeftNav/LeftNav';
import type { ScreenId } from '../../types';

interface Props {
  activeScreen: ScreenId;
  onNavigate: (s: ScreenId) => void;
}

const SAILOR_CAPTURES = [
  { name: 'Rasmus', role: 'Flight Controller', done: true,  quote: '"Waited for a call. Had the angle. Nobody owns this decision clearly."', focus: 'Tack timing · Flight stability · Offset call' },
  { name: 'Tom',    role: 'Wing Trimmer',       done: true,  quote: '"Call was on time. Speed was already lost from the previous leg."', focus: 'Wing trim · Start sequence comms' },
  { name: 'Ana',    role: 'Grinder',            done: true,  quote: '"Felt the hesitation. Needed someone to commit. Agree with Rasmus."', focus: 'Grinder load · Foil transitions' },
  { name: 'Bruno',  role: 'Grinder',            done: true,  quote: '"Speed was already down from the gate. Maybe two separate problems."', focus: 'Port gybe timing' },
  { name: 'Felipe', role: 'Bowman',             done: false, quote: '', focus: 'Bow work · Mark 2 approach' },
  { name: 'Lucas',  role: 'Helmsman',           done: false, quote: '', focus: 'Start line bias · Pre-start positioning' },
];

export default function Capture({ activeScreen, onNavigate }: Props) {
  const { role } = useRole();

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
      <LeftNav activeScreen={activeScreen} onNavigate={onNavigate} />
      {role.id === 'athlete' ? <AthleteCapture /> : <ReadOnlyCapture />}
    </div>
  );
}

/* ── Athlete view — phone mockup ── */
function AthleteCapture() {
  const [recTime, setRecTime] = useState(6 * 60 + 12);

  useEffect(() => {
    const t = setInterval(() => setRecTime(prev => (prev > 0 ? prev - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, []);

  const mm = Math.floor(recTime / 60);
  const ss = String(recTime % 60).padStart(2, '0');

  return (
    <div className="s-capture">
      <div className="phone">
        <div className="ph-sb">
          <span className="ph-time">16:42</span>
          <span className="ph-icons">
            <svg width="12" height="10" viewBox="0 0 20 16" fill="currentColor"><rect x="0" y="10" width="3" height="6" rx="1"/><rect x="4" y="7" width="3" height="9" rx="1"/><rect x="8" y="4" width="3" height="12" rx="1"/><rect x="12" y="1" width="3" height="15" rx="1"/></svg>
            <svg width="14" height="10" viewBox="0 0 22 16" fill="currentColor"><path d="M11 4.5C7.7 4.5 4.7 6 2.8 8.3L1 6.5C3.3 3.7 6.9 2 11 2s7.7 1.7 10 4.5l-1.8 1.8C17.3 6 14.3 4.5 11 4.5zm0 4c-1.9 0-3.6.8-4.8 2L4.4 8.7C6 6.9 8.4 5.8 11 5.8s5 1.1 6.6 2.9l-1.8 1.8C14.6 9.3 12.9 8.5 11 8.5zm0 4c-.9 0-1.7.4-2.3 1L11 16l2.3-2.5C12.7 13 11.9 12.5 11 12.5z"/></svg>
            <svg width="20" height="10" viewBox="0 0 30 16" fill="none"><rect x="0" y="2" width="26" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/><rect x="1" y="3" width="20" height="10" rx="1" fill="currentColor"/><rect x="27" y="5" width="2" height="6" rx="1" fill="currentColor"/></svg>
          </span>
        </div>

        <div className="cap-hdr">
          <div className="cap-row1">
            <div className="cap-wm">Ging<span className="ai">AI</span></div>
            <div className="cap-badge"><div className="rblink" /> POST-RACE · R5</div>
          </div>
          <div className="why-bar">
            <div className="why-seg done" /><div className="why-seg done" />
            <div className="why-seg now" /><div className="why-seg" /><div className="why-seg" />
          </div>
          <div className="why-lbl">Why 3 of 5 · 4/6 sailors done</div>
        </div>

        <div className="cap-convo">
          <AiQ text="After Race 5 — what was the <strong>one moment</strong> that cost you most? First thing that comes." />
          <SailorR text="The tack at mark 2. Way too late — lost about 3 boat lengths." />
          <AiQ why="Why 1" text="What caused the timing to be off? Your read of the mark, a communication gap, or something else?" />
          <SailorR text="I was waiting for a call that never came. I had the angle — should have just gone." />
          <AiQ why="Why 2" text="Why were you waiting for a call? Is that the agreed protocol, or was the ownership unclear?" />
          <SailorR text="We never actually decided who owns that call in these conditions. Both of us thought the other person was on it." />
          <AiQ why="Why 3" whyColor="var(--red)" text="That's a clear ownership gap. <strong>Is the decision rule genuinely unclear, or is it clear but not followed?</strong>" recording />
        </div>

        <div className="cap-foot">
          <div className="waveform">
            {Array.from({ length: 12 }).map((_, i) => <div key={i} className="wv" />)}
          </div>
          <button className="rec-btn">
            <IconStop />
          </button>
          <div className="rec-info">
            <div className="rec-lbl">Recording</div>
            <div className="rec-time">{mm}:{ss}</div>
            <div className="rec-hint">~3 min remaining</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AiQ({ text, why, whyColor, recording }: { text: string; why?: string; whyColor?: string; recording?: boolean }) {
  return (
    <div className="ai-q">
      <div className="ai-q-ava"><IconStar size={12} /></div>
      <div className="ai-q-bub">
        {why && <><div className="why-chip" style={whyColor ? { color: whyColor } : undefined}>{why}{recording ? ' · Recording' : ''}</div><br /></>}
        <span dangerouslySetInnerHTML={{ __html: text }} />
      </div>
    </div>
  );
}

function SailorR({ text }: { text: string }) {
  return (
    <div className="sailor-r">
      <div className="sailor-r-ava">R</div>
      <div className="sailor-r-bub">{text}</div>
    </div>
  );
}

/* ── Coach/Analyst view — read-only summary ── */
function ReadOnlyCapture() {
  const { role } = useRole();

  return (
    <div className="cap-readonly">
      <div className="cap-ro-header">
        <div className="eyebrow">Capture · Post R5/R6/R7</div>
        <div className="page-title" style={{ fontSize: 28 }}>
          Sailor Captures
          <span className="ptag ptag-r" style={{ fontSize: 11 }}>4/6 done</span>
        </div>
        {role.id === 'coach' && (
          <div style={{ marginTop: 10, fontSize: 13, color: 'var(--text3)', lineHeight: 1.6 }}>
            Live synthesis running. GingAI is ranking topics by impact as captures complete.
          </div>
        )}
        {role.id === 'analyst' && (
          <div style={{ marginTop: 10, fontSize: 13, color: 'var(--text3)', lineHeight: 1.6 }}>
            Showing all sailor inputs. Cross-reference with Oracle telemetry in Intelligence screen.
          </div>
        )}
      </div>
      <div className="cap-ro-grid">
        {SAILOR_CAPTURES.map(s => (
          <div key={s.name} className={`cap-ro-card${s.done ? ' cap-ro-card-done' : ' cap-ro-card-pending'}`}>
            <div className="cap-ro-who">
              <div className="cap-ro-ava" style={s.done ? { background: 'var(--gg)', border: '1px solid var(--gb)', color: 'var(--green)' } : undefined}>
                {s.name[0]}
              </div>
              <div>
                <div className="cap-ro-name">{s.name}</div>
                <div className="cap-ro-status" style={{ color: s.done ? 'var(--green)' : 'var(--text4)' }}>
                  {s.done ? 'Capture complete' : 'Pending…'}
                </div>
              </div>
            </div>
            {s.done ? (
              <>
                <div className="cap-ro-quote">{s.quote}</div>
                <div className="cap-ro-focus">Focus: {s.focus}</div>
              </>
            ) : (
              <div className="cap-ro-quote" style={{ color: 'var(--text4)' }}>
                Waiting for dock-in · Focus: {s.focus}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
