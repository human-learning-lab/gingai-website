'use client';

import { useState, useCallback, useMemo } from 'react';
import { TUTORIAL_STEPS } from '@/data/tutorialSteps';
import { useRole } from '@/context/RoleContext';
import { IconMic } from '@/components/Icons';
import './TutorialModal.css';

interface Props {
  onClose: () => void;
}

/* ── Mini preview panels ── */

function PreviewWelcome() {
  return (
    <div className="tut-prev-welcome">
      <img src="/images/logo/team_logo.png" alt="Ginga" className="tut-prev-logo" />
      <div className="tut-prev-welcome-label">
        Ginga<span style={{ color: 'var(--green)' }}>AI</span>
      </div>
    </div>
  );
}

function PreviewSchedule() {
  const rows = [
    { time: '07:30', label: 'Team Briefing', dot: 'var(--navy)'   },
    { time: '09:00', label: 'Simulator',     dot: 'var(--text3)'  },
    { time: '13:00', label: 'Racing',        dot: 'var(--green)'  },
    { time: '17:30', label: 'Debrief',       dot: 'var(--yellow)' },
  ];
  return (
    <div className="tut-prev-inner">
      <div className="tut-prev-eyebrow">RACE DAY 3 · BERMUDA</div>
      {rows.map(r => (
        <div key={r.time} className="tut-prev-row">
          <span className="tut-prev-time">{r.time}</span>
          <span className="tut-prev-dot" style={{ background: r.dot }} />
          <div className="tut-prev-block">{r.label}</div>
        </div>
      ))}
    </div>
  );
}

function PreviewGingAI() {
  const suggestions = [
    'When did we last sail in similar conditions?',
    'What did we decide about tack timing?',
  ];
  return (
    <div className="tut-prev-gingai">
      <div className="tut-prev-ask-bar">
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
          <path d="M7 1L8.2 5.8L13 7L8.2 8.2L7 13L5.8 8.2L1 7L5.8 5.8L7 1Z" fill="var(--green)" opacity="0.9"/>
        </svg>
        <span className="tut-prev-ask-placeholder">Ask anything…</span>
      </div>
      <div className="tut-prev-ask-chips">
        {suggestions.map(s => (
          <div key={s} className="tut-prev-ask-chip">{s}</div>
        ))}
      </div>
    </div>
  );
}

function PreviewCapture() {
  const steps = ['Tap Record', 'Speak naturally', 'Review & edit', 'Save'];
  return (
    <div className="tut-prev-capture">
      <div className="tut-prev-mic">
        <IconMic size={24} />
      </div>
      <div className="tut-prev-steps">
        {steps.map((s, i) => (
          <div key={i} className="tut-prev-step">
            <div
              className="tut-prev-step-num"
              style={{
                background: i === 0 ? 'var(--green)' : 'var(--bg4)',
                color: i === 0 ? '#fff' : 'var(--text4)',
              }}
            >
              {i + 1}
            </div>
            <span style={{ fontSize: 11, color: i === 0 ? 'var(--text2)' : 'var(--text4)' }}>{s}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PreviewDebrief() {
  const topics = [
    { num: '01', label: 'Tack timing at Mark 2', pct: 94, color: 'var(--red)'    },
    { num: '02', label: 'Gybe communication',     pct: 71, color: 'var(--yellow)' },
    { num: '03', label: 'Flight stability',       pct: 58, color: 'var(--green)'  },
    { num: '04', label: 'Pre-start alignment',    pct: 44, color: 'var(--text3)'  },
  ];
  return (
    <div className="tut-prev-inner">
      <div className="tut-prev-eyebrow">DEBRIEF AGENDA</div>
      {topics.map(t => (
        <div key={t.num} className="tut-prev-topic">
          <span className="tut-prev-topic-num">{t.num}</span>
          <span className="tut-prev-topic-label">{t.label}</span>
          <div className="tut-prev-bar-track">
            <div className="tut-prev-bar-fill" style={{ width: `${t.pct}%`, background: t.color }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function PreviewTranscripts() {
  const items = [
    { label: 'Race 2 Debrief',            tag: 'Debrief', color: 'var(--green)', time: 'Today'     },
    { label: 'Pre-start voice capture',   tag: 'Capture', color: 'var(--red)',   time: '2h ago'    },
    { label: 'Coaching session — gybing', tag: 'Upload',  color: 'var(--text3)', time: 'Yesterday' },
  ];
  return (
    <div className="tut-prev-inner">
      {items.map(item => (
        <div key={item.label} className="tut-prev-tx">
          <div className="tut-prev-tx-body">
            <span className="tut-prev-tx-label">{item.label}</span>
            <div className="tut-prev-tx-meta">
              <span className="tut-prev-tx-tag" style={{ color: item.color }}>{item.tag}</span>
              <span className="tut-prev-tx-time">{item.time}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

const PREVIEWS: Record<string, React.ReactElement> = {
  welcome:     <PreviewWelcome />,
  backbone:    <PreviewSchedule />,
  gingai:      <PreviewGingAI />,
  capture:     <PreviewCapture />,
  debrief:     <PreviewDebrief />,
  transcripts: <PreviewTranscripts />,
};

/* ── Modal ── */

export default function TutorialModal({ onClose }: Props) {
  const { role } = useRole();

  const steps = useMemo(() => TUTORIAL_STEPS.filter(s => {
    if (!s.requiredViews) return true;
    return role ? s.requiredViews.includes(role.view) : false;
  }), [role]);

  const [step, setStep] = useState(0);
  const total = steps.length;
  const current = steps[step];
  const isFirst = step === 0;
  const isLast = step === total - 1;

  const handleNext = useCallback(() => {
    if (isLast) onClose(); else setStep(s => s + 1);
  }, [isLast, onClose]);

  const handleBack = useCallback(() => {
    if (!isFirst) setStep(s => s - 1);
  }, [isFirst]);

  return (
    <div className="tut-backdrop" onClick={onClose}>
      <div className="tut-card" onClick={e => e.stopPropagation()}>

        {/* Top bar */}
        <div className="tut-topbar">
          <span className="tut-step-count">{step + 1} / {total}</span>
          <button className="tut-close" onClick={onClose} aria-label="Close tutorial">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <line x1="1" y1="1" x2="11" y2="11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <line x1="11" y1="1" x2="1" y2="11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Preview panel */}
        {current.screen && PREVIEWS[current.screen] && (
          <div className="tut-preview">
            {PREVIEWS[current.screen]}
          </div>
        )}

        {/* Text */}
        <div className="tut-body">
          {current.status && (
            <span className={`tut-status tut-status-${current.status}`}>
              {current.status === 'live' && '● Live'}
              {current.status === 'beta' && '◐ Beta'}
              {current.status === 'demo' && '◑ Demo data'}
              {current.status === 'soon' && '○ Coming soon'}
            </span>
          )}
          <h2 className="tut-title">{current.title}</h2>
          <p className="tut-text">{current.body}</p>
        </div>

        {/* Footer */}
        <div className="tut-footer">
          <div className="tut-dots">
            {steps.map((_, i) => (
              <button
                key={i}
                className={`tut-dot${i === step ? ' on' : ''}`}
                onClick={() => setStep(i)}
                aria-label={`Step ${i + 1}`}
              />
            ))}
          </div>
          <div className="tut-actions">
            <button className="tut-btn-back" onClick={handleBack} disabled={isFirst}>Back</button>
            <button className="tut-btn-next" onClick={handleNext}>{isLast ? 'Done' : 'Next'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
