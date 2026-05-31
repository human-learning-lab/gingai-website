'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRole } from '@/context/RoleContext';
import { useUser } from '@clerk/nextjs';
import { IconStop } from '@/components/Icons';
import { addCapture } from '@/data/captureStore';

type Phase = 'idle' | 'recording' | 'transcribing' | 'review';


function UserAvatar({ imgUrl, initial }: { imgUrl?: string; initial?: string }) {
  return (
    <div className="sailor-r-ava" style={{ overflow: 'hidden', padding: 0 }}>
      {imgUrl ? (
        <img src={imgUrl} alt={initial ?? 'Me'} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
      ) : (
        initial ?? '?'
      )}
    </div>
  );
}

function GingAIAvatar() {
  return (
    <div className="ai-q-ava" style={{ background: '#0D0B08', border: '1.5px solid var(--gb)', position: 'relative', overflow: 'visible' }}>
      <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 15, color: 'var(--green)', letterSpacing: '-0.02em', lineHeight: 1 }}>G</span>
      <span style={{ position: 'absolute', top: -2, right: -2, width: 7, height: 7, borderRadius: '50%', background: 'var(--yellow)', border: '1.5px solid var(--bg)' }} />
    </div>
  );
}


interface SessionTabProps {
  transcriptLines?: string[];
  sentimentPts?: number[];
  topics?: string[];
  onRecordingChange?: (recording: boolean) => void;
}


export default function Capture({ transcriptlines, sentimentpts: _sentimentpts, topics: _topics, onrecordingchange }: sessiontabprops) {
  const { role } = useRole();
  const { user } = useUser();
  const imgUrl = user?.imageUrl;
  const [phase, setPhase] = useState<Phase>('idle');
  const [transcript, setTranscript] = useState('');
  const [interim, setInterim] = useState('');
  const [saved, setSaved] = useState<{ text: string; ts: string }[]>([]);
  const [recTime, setRecTime] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);



  const startRecording = useCallback(async () => {
    setPhase('recording');
    setRecTime(0);
    setTranscript('');
    setInterim('');
    onRecordingChange?.(true);
    timerRef.current = setInterval(() => setRecTime(p => p + 1), 1000);
  });


  const stopRecording = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setInterim('');
    onRecordingChange?.(false);
    setPhase('review');
  }, [transcript]);

  function handleSave() {
    const text = transcript.trim();
    if (!text) return;
    const ts = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    const id = `capture-${Date.now()}`;
    addCapture({
      id,
      source: 'capture',
      regatta: '',
      race: '',
      team: role?.initial ?? 'BRA',
      title: 'Capture',
      duration: `${mm}:${ss}`,
      lines: [{ speaker: role?.name ?? 'Me', text }],
      avatarUrl: imgUrl,
    });
    setSaved(prev => [{ text, ts }, ...prev]);
    setTranscript('');
    setPhase('idle');
  }

  const mm = String(Math.floor(recTime / 60)).padStart(2, '0');
  const ss = String(recTime % 60).padStart(2, '0');

  const CAP_STEPS = [
    'Tap record and speak naturally — no script needed.',
    'GingAI transcribes in real time as you speak.',
    'Review your words, edit if needed, then save.',
    'Find it instantly in Transcripts, tagged as Capture.',
  ];

  const idleInfo = (
    <div className="cap-idle-info">
      <div className="cap-idle-steps">
        {CAP_STEPS.map((step, i) => (
          <div key={i} className="cap-idle-step">
            <span className="cap-idle-step-num">{i + 1}</span>
            <span>{step}</span>
          </div>
        ))}
      </div>
      {saved.length > 0 && (
        <div className="cap-idle-session">
          <span className="cap-idle-session-val">{saved.length}</span>
          <span className="cap-idle-session-key">note{saved.length > 1 ? 's' : ''} saved this session</span>
        </div>
      )}
    </div>
  );

  const convoContent = (
    <>
      {saved.length === 0 && phase === 'idle' && (
        <div className="ai-q">
          <GingAIAvatar />
          <div className="ai-q-bub">
            What's on your mind after today? Tap record and just speak.
          </div>
        </div>
      )}

      {saved.map((s, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div className="sailor-r">
            <UserAvatar imgUrl={imgUrl} initial={role?.initial} />
            <div className="sailor-r-bub">{s.text}</div>
          </div>
          <div style={{ fontSize: 10, color: 'var(--text4)', paddingLeft: 46 }}>{s.ts} · Saved</div>
        </div>
      ))}

      {phase === 'recording' && (
        <div className="ai-q">
          <GingAIAvatar />
          <div className="ai-q-bub" style={{ color: 'var(--text3)', fontStyle: 'italic' }}>
            {transcript || interim ? (transcript + interim) : 'Listening…'}
          </div>
        </div>
      )}

      {phase === 'transcribing' && (
        <div className="ai-q">
          <GingAIAvatar />
          <div className="ai-q-bub" style={{ color: 'var(--text3)', fontStyle: 'italic' }}>Transcribing…</div>
        </div>
      )}

      {phase === 'review' && (
        <div className="sailor-r" style={{ alignItems: 'flex-start' }}>
          <UserAvatar imgUrl={imgUrl} initial={role?.initial} />
          <div
            contentEditable
            suppressContentEditableWarning
            onInput={e => setTranscript(e.currentTarget.textContent ?? '')}
            style={{
              flex: 1, background: 'var(--gg)', border: '1px solid var(--gb)',
              borderRadius: '12px 3px 12px 12px', padding: '11px 13px',
              fontSize: 13, color: 'var(--text)', lineHeight: 1.6,
              fontFamily: 'inherit', outline: 'none', whiteSpace: 'pre-wrap',
              wordBreak: 'break-word', cursor: 'text',
            }}
          >
            {transcript}
          </div>
        </div>
      )}
    </>
  );

  const controlsContent = (
    <>
      {phase === 'recording' && (
        <div className="waveform">
          {Array.from({ length: 12 }).map((_, i) => <div key={i} className="wv" />)}
        </div>
      )}
      {phase === 'review' && (
        <button
          onClick={() => { setTranscript(''); startRecording(); }}
          style={{
            height: 28, padding: '0 12px', borderRadius: 6,
            border: '1px solid var(--line)', background: 'transparent',
            fontSize: 11, cursor: 'pointer', color: 'var(--text3)', fontFamily: 'inherit',
          }}
        >
          Re-record
        </button>
      )}

      {phase === 'idle' || phase === 'review' ? (
        <button
          className="rec-btn"
          onClick={phase === 'idle' ? startRecording : handleSave}
          disabled={phase === 'review' && !transcript.trim()}
          style={phase === 'review' && !transcript.trim() ? { opacity: 0.3, cursor: 'default' } : undefined}
        >
          {phase === 'review' ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="white">
              <rect x="5" y="1" width="6" height="9" rx="3" fill="white"/>
              <path d="M3 8a5 5 0 0 0 10 0" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
              <line x1="8" y1="13" x2="8" y2="15" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          )}
        </button>
      ) : phase === 'recording' ? (
        <button className="rec-btn" onClick={stopRecording}>
          <IconStop />
        </button>
      ) : (
        <div className="rec-btn" style={{ opacity: 0.3, cursor: 'default' }}>
          <IconStop />
        </div>
      )}

      <div className="rec-info">
        <div className="rec-lbl" style={phase === 'recording' ? { color: 'var(--green)' } : undefined}>
          {phase === 'idle' ? 'Tap to record' : phase === 'recording' ? 'Recording' : phase === 'transcribing' ? 'Transcribing…' : 'Tap to save'}
        </div>
        {phase === 'recording' && <div className="rec-time">{mm}:{ss}</div>}
      </div>
    </>
  );

  return (
    <div className="s-capture-wrap">

      {/* ── Desktop layout ───────────────────────────── */}
      <div className="s-cap-desk">
        <div className="s-cap-desk-main">
          <div className="s-cap-desk-header">
            <div>
              <div className="s-cap-desk-title">Capture</div>
              <div className="s-cap-desk-sub">
                {phase === 'idle' && saved.length === 0 && 'Speak freely — GingAI transcribes and stores your notes.'}
                {phase === 'idle' && saved.length > 0 && `${saved.length} note${saved.length > 1 ? 's' : ''} saved this session`}
                {phase === 'recording' && <span style={{ color: 'var(--red)' }}>● Recording · {mm}:{ss}</span>}
                {phase === 'transcribing' && 'Transcribing…'}
                {phase === 'review' && 'Review and save your note'}
              </div>
            </div>
          </div>
          <div className="cap-convo">{convoContent}</div>
          <div className="cap-foot cap-foot-desk">{controlsContent}</div>
        </div>

        <aside className="s-cap-desk-side">
          <div className="s-cap-side-section">
            <div className="s-cap-side-label">How it works</div>
            <div className="s-cap-side-steps">
              {CAP_STEPS.map((step, i) => (
                <div key={i} className="s-cap-side-step">
                  <span className="s-cap-side-step-num">{i + 1}</span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="s-cap-side-section">
            <div className="s-cap-side-label">Session</div>
            <div className="s-cap-side-stat">
              <span className="s-cap-side-stat-val">{saved.length}</span>
              <span className="s-cap-side-stat-key">notes saved</span>
            </div>
          </div>

          <div className="s-cap-side-section">
            <div className="s-cap-side-label">Tips</div>
            <ul className="s-cap-side-tips">
              <li>Talk about what went well and what didn&apos;t.</li>
              <li>Mention specific manoeuvres or decisions.</li>
              <li>Reference team-mates by name for better synthesis.</li>
            </ul>
          </div>
        </aside>
      </div>

      {/* ── Mobile layout ────────────────────────────── */}
      <div className="s-capture">
        <div className="phone">
          <div className="cap-convo">
            {convoContent}
            {phase === 'idle' && idleInfo}
          </div>
          <div className="cap-foot">{controlsContent}</div>
        </div>
      </div>

    </div>
  );
}
