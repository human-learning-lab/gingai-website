'use client';

import { useState, useRef, useCallback } from 'react';
import { useRole } from '@/context/RoleContext';
import { IconStop } from '@/components/Icons';

type Phase = 'idle' | 'recording' | 'transcribing' | 'review';

declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

function GingAIAvatar() {
  return (
    <div className="ai-q-ava" style={{ background: '#0D0B08', border: '1.5px solid var(--gb)', position: 'relative', overflow: 'visible' }}>
      <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 15, color: 'var(--green)', letterSpacing: '-0.02em', lineHeight: 1 }}>G</span>
      <span style={{ position: 'absolute', top: -2, right: -2, width: 7, height: 7, borderRadius: '50%', background: 'var(--yellow)', border: '1.5px solid var(--bg)' }} />
    </div>
  );
}

export default function Capture() {
  const { role } = useRole();
  const [phase, setPhase] = useState<Phase>('idle');
  const [transcript, setTranscript] = useState('');
  const [interim, setInterim] = useState('');
  const [saved, setSaved] = useState<{ text: string; ts: string }[]>([]);
  const [recTime, setRecTime] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const hasSpeechAPI = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const startRecording = useCallback(async () => {
    setTranscript('');
    setInterim('');
    setRecTime(0);
    setPhase('recording');

    timerRef.current = setInterval(() => setRecTime(p => p + 1), 1000);

    if (hasSpeechAPI) {
      const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition;
      const rec = new SR();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';
      rec.onresult = (e) => {
        let final = '';
        let inter = '';
        for (let i = 0; i < e.results.length; i++) {
          if (e.results[i].isFinal) final += e.results[i][0].transcript + ' ';
          else inter += e.results[i][0].transcript;
        }
        setTranscript(final);
        setInterim(inter);
      };
      rec.start();
      recognitionRef.current = rec;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => chunksRef.current.push(e.data);
      mr.start();
      mediaRef.current = mr;
    } catch { /* mic denied — speech API fallback still works */ }
  }, [hasSpeechAPI]);

  const stopRecording = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setInterim('');

    if (mediaRef.current && mediaRef.current.state !== 'inactive') {
      mediaRef.current.stop();
      mediaRef.current.stream.getTracks().forEach(t => t.stop());
    }

    if (!transcript.trim() && chunksRef.current.length > 0) {
      setPhase('transcribing');
      try {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const form = new FormData();
        form.append('audio', blob, 'capture.webm');
        const res = await fetch('/api/transcribe', { method: 'POST', body: form });
        if (res.ok) {
          const { text } = await res.json();
          setTranscript(text ?? '');
        }
      } catch { /* fall through */ }
    }

    // Nothing captured at all — go back to idle instead of showing empty review
    if (!transcript.trim()) {
      setPhase('idle');
      return;
    }

    setPhase('review');
  }, [transcript]);

  function handleSave() {
    const text = transcript.trim();
    if (!text) return;
    const ts = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    setSaved(prev => [{ text, ts }, ...prev]);
    setTranscript('');
    setPhase('idle');
  }

  const mm = String(Math.floor(recTime / 60)).padStart(2, '0');
  const ss = String(recTime % 60).padStart(2, '0');

  return (
    <div className="s-capture-wrap">

      <div className="s-capture">
        <div className="phone">

          {/* Conversation area */}
          <div className="cap-convo">
            {phase === 'idle' && saved.length === 0 && (
              <div className="ai-q">
                <GingAIAvatar />
                <div className="ai-q-bub">
                  Ready to capture. Tap record whenever something comes to mind.
                </div>
              </div>
            )}

            {saved.map((s, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div className="sailor-r">
                  <div className="sailor-r-ava">{role?.initial ?? '?'}</div>
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
              <div className="sailor-r">
                <div className="sailor-r-ava">{role?.initial ?? '?'}</div>
                <textarea
                  value={transcript}
                  onChange={e => setTranscript(e.target.value)}
                  style={{
                    flex: 1, background: 'var(--bg2)', border: '1px solid var(--line)',
                    borderRadius: 12, padding: '10px 14px',
                    fontSize: 13, color: 'var(--text)', lineHeight: 1.6,
                    fontFamily: 'inherit', resize: 'none', outline: 'none',
                    minHeight: 80,
                  }}
                />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="cap-foot">
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
          </div>

        </div>
      </div>
    </div>
  );
}
