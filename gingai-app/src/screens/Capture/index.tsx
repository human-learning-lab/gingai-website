import { useState, useEffect, useRef } from 'react';
import { useRole } from '../../context/RoleContext';
import { IconStop } from '../../components/Icons';
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

const STEPS = [
  {
    why: null,
    whyColor: null,
    q: "After Race 5 — what was the <strong>one moment</strong> that cost you most? First thing that comes.",
    prevAnswer: null,
  },
  {
    why: 'Why 1',
    whyColor: 'var(--text3)',
    q: "What caused the timing to be off? Your read of the mark, a communication gap, or something else?",
    prevAnswer: "The tack at mark 2. Way too late — lost about 3 boat lengths.",
  },
  {
    why: 'Why 2',
    whyColor: 'var(--text3)',
    q: "Why were you waiting for a call? Is that the agreed protocol, or was the ownership unclear?",
    prevAnswer: "I was waiting for a call that never came. I had the angle — should have just gone.",
  },
  {
    why: 'Why 3',
    whyColor: 'var(--red)',
    q: "That's a clear ownership gap. <strong>Is the decision rule genuinely unclear, or is it clear but not followed?</strong>",
    prevAnswer: "We never actually decided who owns that call in these conditions. Both of us thought the other person was on it.",
  },
  {
    why: 'Why 4',
    whyColor: 'var(--red)',
    q: "When did you <strong>last explicitly agree</strong> on who owns this call? Has there ever been a clear moment, or has it always been assumed?",
    prevAnswer: "The rule isn't unclear — it just was never enforced. Everyone knew Rasmus should call it.",
  },
  {
    why: 'Why 5',
    whyColor: 'var(--red)',
    q: "So the procedure exists but hasn't been enforced. <strong>What would make this non-negotiable before the next race?</strong>",
    prevAnswer: "We've never actually had a proper conversation about it. It's always been implied.",
  },
];

/* ── Athlete view — phone mockup ── */
function AthleteCapture() {
  const [step, setStep] = useState(2); // start mid-capture for demo
  const [phase, setPhase] = useState<'recording' | 'processing' | 'done'>('recording');
  const [visible, setVisible] = useState(true);
  const [recTime, setRecTime] = useState(6 * 60 + 12);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => setRecTime(prev => (prev > 0 ? prev - 1 : 0)), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  function handleStop() {
    if (phase !== 'recording') return;
    if (timerRef.current) clearInterval(timerRef.current);
    setPhase('processing');

    // fade out → next step → fade in
    setTimeout(() => setVisible(false), 400);
    setTimeout(() => {
      const next = step + 1;
      if (next >= STEPS.length) {
        setPhase('done');
      } else {
        setStep(next);
        setRecTime(60 + Math.floor(Math.random() * 60)); // reset timer
        setPhase('recording');
        timerRef.current = setInterval(() => setRecTime(prev => (prev > 0 ? prev - 1 : 0)), 1000);
      }
      setVisible(true);
    }, 900);
  }

  const mm = Math.floor(recTime / 60);
  const ss = String(recTime % 60).padStart(2, '0');
  const current = STEPS[step];
  const doneCount = step; // segments done before current

  return (
    <div className="s-capture">
      <div className="phone">
        {/* Status bar */}
        <div className="ph-sb">
          <span className="ph-time">16:42</span>
          <span className="ph-icons">
            <svg width="12" height="10" viewBox="0 0 20 16" fill="currentColor"><rect x="0" y="10" width="3" height="6" rx="1"/><rect x="4" y="7" width="3" height="9" rx="1"/><rect x="8" y="4" width="3" height="12" rx="1"/><rect x="12" y="1" width="3" height="15" rx="1"/></svg>
            <svg width="14" height="10" viewBox="0 0 22 16" fill="currentColor"><path d="M11 4.5C7.7 4.5 4.7 6 2.8 8.3L1 6.5C3.3 3.7 6.9 2 11 2s7.7 1.7 10 4.5l-1.8 1.8C17.3 6 14.3 4.5 11 4.5zm0 4c-1.9 0-3.6.8-4.8 2L4.4 8.7C6 6.9 8.4 5.8 11 5.8s5 1.1 6.6 2.9l-1.8 1.8C14.6 9.3 12.9 8.5 11 8.5zm0 4c-.9 0-1.7.4-2.3 1L11 16l2.3-2.5C12.7 13 11.9 12.5 11 12.5z"/></svg>
            <svg width="20" height="10" viewBox="0 0 30 16" fill="none"><rect x="0" y="2" width="26" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/><rect x="1" y="3" width="20" height="10" rx="1" fill="currentColor"/><rect x="27" y="5" width="2" height="6" rx="1" fill="currentColor"/></svg>
          </span>
        </div>

        {/* Header */}
        <div className="cap-hdr">
          <div className="cap-row1">
            <div className="cap-wm">Ging<span className="ai">AI</span></div>
            <div className="cap-badge"><div className="rblink" /> POST-RACE · R5</div>
          </div>
          <div className="why-bar">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`why-seg${i < doneCount ? ' done' : i === step ? ' now' : ''}`}
              />
            ))}
          </div>
          <div className="why-lbl">
            {current.why ? `${current.why} of ${STEPS.length - 1}` : 'Opening'} · 4/6 sailors done
          </div>
        </div>

        {/* Conversation — one question at a time */}
        {phase === 'done' ? (
          <div className="cap-convo" style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center', gap: 8 }}>
            <div style={{ fontSize: 32, color: 'var(--green)', fontFamily: 'Barlow Condensed', fontWeight: 800 }}>Done</div>
            <div style={{ fontSize: 13, color: 'var(--text3)', lineHeight: 1.6 }}>
              Capture complete. GingAI is synthesising your inputs with the team.
            </div>
          </div>
        ) : (
          <div
            className="cap-convo"
            style={{
              opacity: visible ? 1 : 0,
              transition: 'opacity 0.35s ease',
            }}
          >
            {current.prevAnswer && (
              <SailorR text={current.prevAnswer} faded />
            )}

            {phase === 'processing' ? (
              <div className="ai-q">
                <GingAIAvatar />
                <div className="ai-q-bub" style={{ color: 'var(--text3)', fontStyle: 'italic' }}>
                  <ThinkingDots />
                </div>
              </div>
            ) : (
              <AiQ
                why={current.why ?? undefined}
                whyColor={current.whyColor ?? undefined}
                recording
                text={current.q}
              />
            )}
          </div>
        )}

        {/* Footer */}
        <div className="cap-foot">
          {phase === 'recording' && (
            <div className="waveform">
              {Array.from({ length: 12 }).map((_, i) => <div key={i} className="wv" />)}
            </div>
          )}
          {phase === 'processing' && (
            <div style={{ height: 28, display: 'flex', alignItems: 'center', gap: 4 }}>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: 'var(--green)',
                  animation: `pdot 1.2s ease-in-out ${i * 0.2}s infinite`,
                }} />
              ))}
            </div>
          )}
          {phase === 'done' ? (
            <div style={{ fontSize: 13, color: 'var(--text3)' }}>Uploading…</div>
          ) : (
            <button
              className="rec-btn"
              onClick={handleStop}
              style={phase === 'processing' ? { opacity: 0.4, cursor: 'default', background: 'var(--bg3)', boxShadow: 'none', animation: 'none' } : undefined}
            >
              <IconStop />
            </button>
          )}
          <div className="rec-info">
            <div className="rec-lbl" style={phase === 'processing' ? { color: 'var(--green)' } : undefined}>
              {phase === 'processing' ? 'Analysing…' : 'Recording'}
            </div>
            {phase === 'recording' && <div className="rec-time">{mm}:{ss}</div>}
            {phase === 'recording' && <div className="rec-hint">Tap to stop &amp; advance</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── GingAI brand avatar — matches favicon design ── */
function GingAIAvatar() {
  return (
    <div
      className="ai-q-ava"
      style={{ background: '#0D0B08', border: '1.5px solid var(--gb)', position: 'relative', overflow: 'visible' }}
    >
      <span style={{
        fontFamily: "'Barlow Condensed', sans-serif",
        fontWeight: 800,
        fontSize: 15,
        color: 'var(--green)',
        letterSpacing: '-0.02em',
        lineHeight: 1,
      }}>G</span>
      {/* yellow AI dot */}
      <span style={{
        position: 'absolute',
        top: -2,
        right: -2,
        width: 7,
        height: 7,
        borderRadius: '50%',
        background: 'var(--yellow)',
        border: '1.5px solid var(--bg)',
      }} />
    </div>
  );
}

function ThinkingDots() {
  return <span>Analysing your response…</span>;
}

function AiQ({ text, why, whyColor, recording }: { text: string; why?: string; whyColor?: string; recording?: boolean }) {
  return (
    <div className="ai-q">
      <GingAIAvatar />
      <div className="ai-q-bub">
        {why && (
          <>
            <div className="why-chip" style={whyColor ? { color: whyColor } : undefined}>
              {why}{recording ? ' · Recording' : ''}
            </div>
            <br />
          </>
        )}
        <span dangerouslySetInnerHTML={{ __html: text }} />
      </div>
    </div>
  );
}

function SailorR({ text, faded }: { text: string; faded?: boolean }) {
  return (
    <div className="sailor-r" style={faded ? { opacity: 0.4 } : undefined}>
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
