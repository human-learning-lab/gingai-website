'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useRole } from '@/context/RoleContext';
import { useUser } from '@clerk/nextjs';
import { IconStop } from '@/components/Icons';
import { useOfflineRecorder } from '@/hooks/useOfflineRecorder';
import type { OfflineRecording } from '@/lib/offlineDb';

type Phase    = 'idle' | 'recording' | 'transcribing' | 'review';
type CaptureMode = 'live' | 'offline';

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

function fmt(secs: number): string {
  const m = String(Math.floor(secs / 60)).padStart(2, '0');
  const s = String(secs % 60).padStart(2, '0');
  return `${m}:${s}`;
}

// ── Pending uploads list ──────────────────────────────────────

function PendingUploads({ pending, uploadingId, onUpload, onDelete, userName }: {
  pending: OfflineRecording[];
  uploadingId: string | null;
  onUpload: (id: string) => void;
  onDelete: (id: string) => void;
  userName?: string;
}) {
  if (pending.length === 0) return null;
  return (
    <div style={{
      background: 'var(--bg2)', border: '1px solid var(--line)', borderRadius: 10,
      padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text4)', fontFamily: "'Barlow Condensed', sans-serif" }}>
        Saved on device · {pending.length} pending upload{pending.length > 1 ? 's' : ''}
      </div>
      {pending.map(rec => (
        <div key={rec.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text4)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
          </svg>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rec.title}</div>
            <div style={{ fontSize: 10, color: 'var(--text4)' }}>{fmt(rec.duration)} · {rec.status === 'error' ? 'Upload failed — tap to retry' : 'Waiting for upload'}</div>
          </div>
          <button onClick={() => onUpload(rec.id)} disabled={uploadingId === rec.id} style={{
            height: 26, padding: '0 10px', borderRadius: 5,
            border: 'none', background: uploadingId === rec.id ? 'var(--line2)' : 'var(--green)',
            fontSize: 11, fontWeight: 600, color: '#fff', cursor: uploadingId === rec.id ? 'default' : 'pointer',
            fontFamily: 'inherit', flexShrink: 0,
          }}>
            {uploadingId === rec.id ? 'Uploading…' : 'Upload'}
          </button>
          <button onClick={() => onDelete(rec.id)} style={{
            width: 26, height: 26, borderRadius: 5, border: '1px solid var(--line)',
            background: 'transparent', cursor: 'pointer', color: 'var(--text4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0,
          }}>×</button>
        </div>
      ))}
    </div>
  );
}

// ── Mode toggle ───────────────────────────────────────────────

function ModeToggle({ mode, onChange }: { mode: CaptureMode; onChange: (m: CaptureMode) => void }) {
  return (
    <div style={{ display: 'flex', background: 'var(--bg2)', borderRadius: 7, padding: 2, border: '1px solid var(--line)', gap: 2, flexShrink: 0 }}>
      {(['live', 'offline'] as CaptureMode[]).map(m => (
        <button key={m} onClick={() => onChange(m)} style={{
          height: 24, padding: '0 10px', borderRadius: 5, border: 'none',
          background: mode === m ? 'var(--bg)' : 'transparent',
          boxShadow: mode === m ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
          fontSize: 11, fontWeight: 600, cursor: 'pointer',
          color: mode === m ? 'var(--text)' : 'var(--text4)',
          fontFamily: 'inherit', textTransform: 'capitalize', transition: 'all 0.12s',
        }}>{m}</button>
      ))}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────

interface CaptureTabProps {
  transcriptLines?: string[];
  sentimentPts?: number[];
  topics?: string[];
  onRecordingChange?: (recording: boolean) => void;
}

interface QuestionsResponse {
  Questions: string[];
}

export default function Capture({ transcriptLines, sentimentPts: _s, topics: _t, onRecordingChange }: CaptureTabProps) {
  const { role } = useRole();
  const { user } = useUser();
  const imgUrl = user?.imageUrl;
  const userName = user?.firstName ?? user?.emailAddresses?.[0]?.emailAddress?.split('@')[0] ?? role?.name;

  const [mode, setMode]         = useState<CaptureMode>('live');
  const [phase, setPhase]       = useState<Phase>('idle');
  const [saved, setSaved]       = useState<{ text: string; ts: string }[]>([]);
  const [recTime, setRecTime]   = useState(0);
  const [transcript, setTranscript] = useState('');
  const [questions, setQuestions] = useState<QuestionsResponse | null>(null);
  const [waiting, setWaiting] = useState(true);
  const [offlineSaved, setOfflineSaved] = useState(false);

  const lines    = transcriptLines ?? [];
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const offline = useOfflineRecorder();

  // ── Live mode recording ───────────────────────

  const startRecording = useCallback(async () => {
    setPhase('recording');
    setRecTime(0);
    onRecordingChange?.(true);
    timerRef.current = setInterval(() => setRecTime(p => p + 1), 1000);
  }, []);

  const stopRecording = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTranscript(lines.join('\n'));
    onRecordingChange?.(false);
    setPhase('review');
  }, [lines, onRecordingChange]);

  function handleSave() {
    const text = transcript.trim();
    if (!text) return;
    const ts = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    fetch('/api/transcripts?type=capture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'capture', user: userName, text }),
    });
    setSaved(prev => [{ text, ts }, ...prev]);
    setTranscript('');
    setPhase('idle');
  }


  

  useEffect(() => {
    async function get_questions() {
		const res = await fetch(`/api/questions?sailor=${userName}`);
		if (!res.ok){
			throw new Error('Failed to fetch Questions');
		} else{
			const questions : QuestionsResponse = await res.json();
			setQuestions(questions);
		}
  	}

	  get_questions();
	  setWaiting(false);
  }, []);


  // ── Offline mode recording ────────────────────

  async function handleOfflineStart() {
    setOfflineSaved(false);
    await offline.startRecording();
  }

  async function handleOfflineStop() {
    await offline.stopRecording();
    setOfflineSaved(true);
    setTimeout(() => setOfflineSaved(false), 3000);
  }

  // ── Formatting ────────────────────────────────

  const mm = String(Math.floor(recTime / 60)).padStart(2, '0');
  const ss = String(recTime % 60).padStart(2, '0');

  const CAP_STEPS = [
    'Tap record and speak naturally — no script needed.',
    'GingAI transcribes in real time as you speak.',
    'Review your words, edit if needed, then save.',
    'Find it instantly in Transcripts, tagged as Capture.',
  ];

  const OFFLINE_STEPS = [
    'Switch to Offline mode — no internet needed.',
    'Tap record. Audio is saved directly on this device.',
    'When back online, upload your recording with one tap.',
    'Viktor\'s server transcribes and stores it automatically.',
  ];

  // ── Shared views ──────────────────────────────

  const pendingUploads = (
    <PendingUploads
      pending={offline.pending}
      uploadingId={offline.uploadingId}
      onUpload={id => offline.uploadRecording(id, userName)}
      onDelete={offline.removeRecording}
      userName={userName}
    />
  );

  // ── Live conversation content ─────────────────

  const liveConvoContent = (
    <>
      {saved.length === 0 && phase === 'idle' && (
        <div className="ai-q">
          <GingAIAvatar />
		   {waiting ? (
    			"Waiting"
		   ) : (
      		{questions?.Questions.map((q, index) => (
				<div className="ai-q-bub">{q}</div>
      		))}
  			)}
        </div>
      )}

      {saved.map((s, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div className="sailor-r">
            <UserAvatar imgUrl={imgUrl} initial={userName?.[0]?.toUpperCase()} />
            <div className="sailor-r-bub">{s.text}</div>
          </div>
          <div style={{ fontSize: 10, color: 'var(--text4)', paddingLeft: 46, display: 'flex', alignItems: 'center', gap: 6 }}>
            {s.ts} · Saved ·{' '}
            <Link href="/transcripts" style={{ color: 'var(--green)', textDecoration: 'none', fontWeight: 600 }}>
              View in Transcripts →
            </Link>
          </div>
        </div>
      ))}

      {phase === 'recording' && (
        <div className="ai-q">
          <GingAIAvatar />
          <div className="ai-q-bub">
            {lines.length === 0
              ? <span style={{ color: 'var(--text4)', fontStyle: 'italic' }}>Listening…</span>
              : lines.map((line, i) => <p key={i} style={{ margin: '0 0 4px', fontSize: 13, lineHeight: 1.6, color: 'var(--text2)' }}>{line}</p>)
            }
          </div>
        </div>
      )}

      {phase === 'review' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ paddingLeft: 46, fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            Review · edit if needed
          </div>
          <div className="sailor-r" style={{ alignItems: 'flex-start' }}>
            <UserAvatar imgUrl={imgUrl} initial={userName?.[0]?.toUpperCase()} />
            <textarea
              autoFocus
              value={transcript}
              onChange={e => setTranscript(e.target.value)}
              rows={Math.max(3, transcript.split('\n').length + 1)}
              style={{
                flex: 1, background: 'var(--gg)', border: '1.5px solid var(--green)',
                borderRadius: '12px 3px 12px 12px', padding: '11px 13px',
                fontSize: 13, color: 'var(--text)', lineHeight: 1.6,
                fontFamily: 'inherit', outline: 'none', resize: 'none',
                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                direction: 'ltr', textAlign: 'left', width: '100%',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>
      )}
    </>
  );

  const liveControlsContent = (
    <>
      {phase === 'recording' && (
        <div className="waveform">
          {Array.from({ length: 12 }).map((_, i) => <div key={i} className="wv" />)}
        </div>
      )}

      {phase === 'review' ? (
        <div style={{ display: 'flex', gap: 10, width: '100%', maxWidth: 340 }}>
          <button
            onClick={() => { setTranscript(''); startRecording(); }}
            style={{
              height: 44, padding: '0 16px', borderRadius: 10,
              border: '1px solid var(--line)', background: 'transparent',
              fontSize: 12, cursor: 'pointer', color: 'var(--text3)', fontFamily: 'inherit',
              flexShrink: 0,
            }}
          >Re-record</button>
          <button
            onClick={handleSave}
            disabled={!transcript.trim()}
            style={{
              flex: 1, height: 44, borderRadius: 10, border: 'none',
              background: transcript.trim() ? 'var(--green)' : 'var(--line)',
              color: '#fff', fontSize: 13, fontWeight: 600,
              cursor: transcript.trim() ? 'pointer' : 'default',
              fontFamily: 'inherit', display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 7, transition: 'opacity 0.15s',
              opacity: transcript.trim() ? 1 : 0.4,
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            Save note
          </button>
        </div>
      ) : phase === 'idle' ? (
        <>
          <button className="rec-btn" onClick={startRecording}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="white">
              <rect x="5" y="1" width="6" height="9" rx="3" fill="white"/>
              <path d="M3 8a5 5 0 0 0 10 0" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
              <line x1="8" y1="13" x2="8" y2="15" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
          <div className="rec-info">
            <div className="rec-lbl">Tap to record</div>
          </div>
        </>
      ) : phase === 'recording' ? (
        <>
          <button className="rec-btn" onClick={stopRecording}><IconStop /></button>
          <div className="rec-info">
            <div className="rec-lbl" style={{ color: 'var(--green)' }}>Recording</div>
            <div className="rec-time">{mm}:{ss}</div>
          </div>
        </>
      ) : (
        <>
          <div className="rec-btn" style={{ opacity: 0.3, cursor: 'default' }}><IconStop /></div>
          <div className="rec-info">
            <div className="rec-lbl">Transcribing…</div>
          </div>
        </>
      )}
    </>
  );

  // ── Offline conversation content ──────────────

  const offlineConvoContent = (
    <>
      {!offline.isRecording && !offlineSaved && offline.pending.length === 0 && (
        <div className="ai-q">
          <GingAIAvatar />
          <div className="ai-q-bub">
            Offline mode — your recording is saved on this device. Upload when you're back online.
          </div>
        </div>
      )}

      {offlineSaved && (
        <div className="ai-q">
          <GingAIAvatar />
          <div className="ai-q-bub" style={{ color: 'var(--green)' }}>
            ✓ Saved on device. Upload it when you have internet.
          </div>
        </div>
      )}

      {offline.isRecording && (
        <div className="ai-q">
          <GingAIAvatar />
          <div className="ai-q-bub">
            <span style={{ color: 'var(--red)', fontWeight: 600 }}>● Recording offline</span>
            <span style={{ color: 'var(--text4)', fontSize: 12, display: 'block', marginTop: 2 }}>
              Audio saved locally · no transcription · {fmt(offline.duration)}
            </span>
          </div>
        </div>
      )}

      {pendingUploads}
    </>
  );

  const offlineControlsContent = (
    <>
      {offline.isRecording && (
        <div className="waveform">
          {Array.from({ length: 12 }).map((_, i) => <div key={i} className="wv" />)}
        </div>
      )}
      <button
        className="rec-btn"
        onClick={offline.isRecording ? handleOfflineStop : handleOfflineStart}
        style={{ background: offline.isRecording ? 'var(--red)' : undefined }}
      >
        {offline.isRecording ? (
          <IconStop />
        ) : (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="white">
            <rect x="5" y="1" width="6" height="9" rx="3" fill="white"/>
            <path d="M3 8a5 5 0 0 0 10 0" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
            <line x1="8" y1="13" x2="8" y2="15" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        )}
      </button>
      <div className="rec-info">
        <div className="rec-lbl" style={offline.isRecording ? { color: 'var(--red)' } : undefined}>
          {offline.isRecording ? 'Recording offline' : 'Tap to record'}
        </div>
        {offline.isRecording && <div className="rec-time">{fmt(offline.duration)}</div>}
        {!offline.isRecording && (
          <div className="rec-lbl" style={{ fontSize: 10, color: 'var(--text4)' }}>No internet needed</div>
        )}
      </div>
    </>
  );

  const convoContent    = mode === 'live' ? liveConvoContent    : offlineConvoContent;
  const controlsContent = mode === 'live' ? liveControlsContent : offlineControlsContent;

  const idleInfo = (
    <div className="cap-idle-info">
      <div className="cap-idle-steps">
        {(mode === 'live' ? CAP_STEPS : OFFLINE_STEPS).map((step, i) => (
          <div key={i} className="cap-idle-step">
            <span className="cap-idle-step-num">{i + 1}</span>
            <span>{step}</span>
          </div>
        ))}
      </div>
      {mode === 'live' && saved.length > 0 && (
        <div className="cap-idle-session">
          <span className="cap-idle-session-val">{saved.length}</span>
          <span className="cap-idle-session-key">note{saved.length > 1 ? 's' : ''} saved this session</span>
        </div>
      )}
    </div>
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
                {mode === 'live' && phase === 'idle' && saved.length === 0 && 'Speak freely — GingAI transcribes and stores your notes.'}
                {mode === 'live' && phase === 'idle' && saved.length > 0 && `${saved.length} note${saved.length > 1 ? 's' : ''} saved this session`}
                {mode === 'live' && phase === 'recording' && <span style={{ color: 'var(--red)' }}>● Recording · {mm}:{ss}</span>}
                {mode === 'live' && phase === 'transcribing' && 'Transcribing…'}
                {mode === 'live' && phase === 'review' && 'Review and save your note'}
                {mode === 'offline' && !offline.isRecording && 'No internet needed — uploads when you\'re back online.'}
                {mode === 'offline' && offline.isRecording && <span style={{ color: 'var(--red)' }}>● Recording offline · {fmt(offline.duration)}</span>}
              </div>
            </div>
            <ModeToggle mode={mode} onChange={m => { setMode(m); setPhase('idle'); }} />
          </div>
          <div className="cap-convo">{convoContent}</div>
          {mode === 'live' && offline.pending.length > 0 && (
            <div style={{ padding: '0 0 12px' }}>{pendingUploads}</div>
          )}
          <div className="cap-foot cap-foot-desk">{controlsContent}</div>
        </div>

        <aside className="s-cap-desk-side">
          <div className="s-cap-side-section">
            <div className="s-cap-side-label">{mode === 'offline' ? 'How offline works' : 'How it works'}</div>
            <div className="s-cap-side-steps">
              {(mode === 'live' ? CAP_STEPS : OFFLINE_STEPS).map((step, i) => (
                <div key={i} className="s-cap-side-step">
                  <span className="s-cap-side-step-num">{i + 1}</span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>

          {mode === 'live' && (
            <div className="s-cap-side-section">
              <div className="s-cap-side-label">Session</div>
              <div className="s-cap-side-stat">
                <span className="s-cap-side-stat-val">{saved.length}</span>
                <span className="s-cap-side-stat-key">notes saved</span>
              </div>
            </div>
          )}

          {mode === 'offline' && offline.pending.length > 0 && (
            <div className="s-cap-side-section">
              <div className="s-cap-side-label">Pending uploads</div>
              <div className="s-cap-side-stat">
                <span className="s-cap-side-stat-val">{offline.pending.length}</span>
                <span className="s-cap-side-stat-key">recording{offline.pending.length > 1 ? 's' : ''} on device</span>
              </div>
            </div>
          )}

          <div className="s-cap-side-section">
            <div className="s-cap-side-label">Tips</div>
            <ul className="s-cap-side-tips">
              {mode === 'live' ? (
                <>
                  <li>Talk about what went well and what didn&apos;t.</li>
                  <li>Mention specific manoeuvres or decisions.</li>
                  <li>Reference team-mates by name for better synthesis.</li>
                </>
              ) : (
                <>
                  <li>Use offline mode on the water or in low-signal areas.</li>
                  <li>Recordings stay on this device until you upload them.</li>
                  <li>Upload as soon as you&apos;re back on WiFi for best results.</li>
                </>
              )}
            </ul>
          </div>
        </aside>
      </div>

      {/* ── Mobile layout ────────────────────────────── */}
      <div className="s-capture">
        <div className="phone">
          <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 0' }}>
            <ModeToggle mode={mode} onChange={m => { setMode(m); setPhase('idle'); }} />
          </div>
          <div className="cap-convo">
            {convoContent}
            {mode === 'live' && phase === 'idle' && idleInfo}
            {mode === 'offline' && !offline.isRecording && idleInfo}
          </div>
          <div className="cap-foot">{controlsContent}</div>
        </div>
      </div>

    </div>
  );
}
