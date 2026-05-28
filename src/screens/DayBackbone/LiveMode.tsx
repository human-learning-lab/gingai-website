'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { getBlocks, getVenueHM, secsRelTZeroTZ } from '@/data/blocks';
import { getTideNow } from '@/data/tides';
import { addCapture } from '@/data/captureStore';
import type { Block } from '@/types';
import './LiveMode.css';

interface Props {
  regatId: string;
  dayIndex: number;
  venueCity: string;
  venueLat?: number;
  venueLon?: number;
  venueTimezone?: string;
  selectedDate: Date;
  onExit: () => void;
  renderContent: (blockId: string) => React.ReactNode;
}

function formatTicker(secs: number): { label: string; elapsed: boolean } {
  const elapsed = secs > 0;
  const abs = Math.abs(secs);
  const hh = String(Math.floor(abs / 3600)).padStart(2, '0');
  const mm = String(Math.floor((abs % 3600) / 60)).padStart(2, '0');
  const ss = String(abs % 60).padStart(2, '0');
  return { label: elapsed ? `+${hh}:${mm}:${ss}` : `${hh}:${mm}:${ss}`, elapsed };
}

function bearingToCardinal(deg: number): string {
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
}

function wmoToSky(code: number): string {
  if (code === 0) return 'Clear';
  if (code <= 3) return 'Partly cloudy';
  if (code <= 48) return 'Overcast';
  if (code <= 67) return 'Rain';
  return 'Showers';
}

// ── Conditions bar ───────────────────────────────────────────

interface WeatherSnap { wind: number; gusts: number; bearing: number; code: number; temp: number; }

function ConditionsBar({ lat, lon, date }: { lat?: number; lon?: number; date: Date }) {
  const [wx, setWx] = useState<WeatherSnap | null>(null);
  const [tide, setTide] = useState(() => getTideNow(date));

  useEffect(() => { setTide(getTideNow(date)); }, [date]);

  useEffect(() => {
    if (!lat || !lon) return;
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,wind_speed_10m,wind_gusts_10m,wind_direction_10m,weather_code&wind_speed_unit=kn&timezone=auto`
    )
      .then(r => r.json())
      .then(d => {
        const c = d.current;
        setWx({ temp: Math.round(c.temperature_2m), wind: Math.round(c.wind_speed_10m), gusts: Math.round(c.wind_gusts_10m), bearing: Math.round(c.wind_direction_10m), code: c.weather_code });
      })
      .catch(() => {});
  }, [lat, lon]);

  const parts: string[] = [];
  if (wx) {
    parts.push(`${wx.temp}°C · ${wmoToSky(wx.code)}`);
    parts.push(`${wx.wind} kts ${bearingToCardinal(wx.bearing)}${wx.gusts > wx.wind + 4 ? ` · gusts ${wx.gusts}` : ''}`);
  }
  if (tide) {
    const dir = tide.dir === 30 ? '↑' : '↓';
    parts.push(`Tide ${tide.speed.toFixed(1)} kn ${dir}${tide.turningAt ? ` · turns ${tide.turningAt}` : ''}`);
  }

  if (!parts.length) return <div className="lm-cond-bar" />;
  return (
    <div className="lm-cond-bar">
      {parts.map((p, i) => (
        <span key={i} className="lm-cond-item">
          {i > 0 && <span className="lm-cond-sep">·</span>}
          {p}
        </span>
      ))}
    </div>
  );
}

// ── Schedule alarm overlay ────────────────────────────────────

function AlarmOverlay({ block, onDismiss }: { block: Block; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 5000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  const isRace = block.tag?.toLowerCase().startsWith('race') || (block.tZeroOffset ?? -999) >= 0;

  if (isRace) {
    return (
      <div className="lm-alarm lm-alarm--race" onClick={onDismiss}>
        <div className="lm-alarm-race-inner">
          {block.tag && <div className="lm-alarm-race-tag">{block.tag}</div>}
          <div className="lm-alarm-race-name">{block.name.replace('🏁 ', '')}</div>
          <div className="lm-alarm-race-time">{block.time}</div>
          <div className="lm-alarm-race-tap">tap to dismiss</div>
        </div>
      </div>
    );
  }

  return (
    <div className="lm-alarm" onClick={onDismiss}>
      <div className="lm-alarm-inner">
        <div className="lm-alarm-eyebrow">NOW</div>
        <div className="lm-alarm-name">{block.name}</div>
        <div className="lm-alarm-time">{block.time}{block.tag ? ` · ${block.tag}` : ''}</div>
        <button className="lm-alarm-ok" onClick={onDismiss}>OK</button>
      </div>
    </div>
  );
}

// ── Performance alarm overlay (from Viktor's alarm server) ────

interface PerfAlarm {
  id: string;
  type: 'positive' | 'negative' | 'neutral';
  message: string;
}

function PerfAlarmOverlay({ alarm, onDismiss }: { alarm: PerfAlarm; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 7000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  const styles = {
    positive: { accent: '#00c24a', label: 'GREAT WORK' },
    negative: { accent: '#e8001c', label: 'WATCH OUT'  },
    neutral:  { accent: '#e07800', label: 'NOTE'        },
  };
  const s = styles[alarm.type];

  const Icon = () => {
    const size = 72;
    const stroke = '#fff';
    const sw = 5;
    if (alarm.type === 'positive') return (
      <svg width={size} height={size} viewBox="0 0 72 72" fill="none">
        <circle cx="36" cy="36" r="34" stroke={s.accent} strokeWidth={sw} />
        <polyline points="18,37 30,50 54,24" stroke={s.accent} strokeWidth={sw + 1} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
    if (alarm.type === 'negative') return (
      <svg width={size} height={size} viewBox="0 0 72 72" fill="none">
        <circle cx="36" cy="36" r="34" stroke={s.accent} strokeWidth={sw} />
        <line x1="22" y1="22" x2="50" y2="50" stroke={s.accent} strokeWidth={sw + 1} strokeLinecap="round" />
        <line x1="50" y1="22" x2="22" y2="50" stroke={s.accent} strokeWidth={sw + 1} strokeLinecap="round" />
      </svg>
    );
    return (
      <svg width={size} height={size} viewBox="0 0 72 72" fill="none">
        <circle cx="36" cy="36" r="34" stroke={s.accent} strokeWidth={sw} />
        <line x1="36" y1="22" x2="36" y2="42" stroke={s.accent} strokeWidth={sw + 1} strokeLinecap="round" />
        <circle cx="36" cy="52" r={sw / 2 + 1} fill={s.accent} />
      </svg>
    );
  };

  return (
    <div
      onClick={onDismiss}
      style={{
        position: 'absolute', inset: 0, zIndex: 150,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.55)',
        cursor: 'pointer',
      }}
    >
      <div style={{
        background: '#fff',
        borderRadius: 16,
        overflow: 'hidden',
        maxWidth: 600,
        width: '94%',
        boxShadow: '0 16px 80px rgba(0,0,0,0.55)',
        animation: 'lm-alarm-in 0.22s cubic-bezier(0.34,1.56,0.64,1)',
      }}>
        {/* Accent top bar */}
        <div style={{ background: s.accent, height: 12 }} />

        <div style={{ padding: '40px 52px 36px', textAlign: 'center' }}>
          {/* Icon */}
          <div style={{ marginBottom: 20 }}>
            <Icon />
          </div>

          {/* Label */}
          <div style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 11, fontWeight: 800, letterSpacing: '0.28em',
            textTransform: 'uppercase', color: s.accent,
            marginBottom: 16,
          }}>{s.label}</div>

          {/* Message */}
          <div style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 52, fontWeight: 900, color: '#0a0a0a',
            lineHeight: 1.08, marginBottom: 36,
            letterSpacing: '-0.02em',
          }}>{alarm.message}</div>

          {/* Dismiss hint */}
          <div style={{
            fontSize: 12, fontWeight: 600,
            color: 'rgba(0,0,0,0.3)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}>tap to dismiss</div>
        </div>
      </div>
    </div>
  );
}

function usePerfAlarms() {
  const [queue, setQueue] = useState<PerfAlarm[]>([]);
  const seenIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    async function poll() {
      try {
        const res = await fetch('/api/alarms', { cache: 'no-store' });
        if (!res.ok) return;
        const alarms: PerfAlarm[] = await res.json();
        const fresh = alarms.filter(a => !seenIds.current.has(a.id));
        if (fresh.length) {
          fresh.forEach(a => seenIds.current.add(a.id));
          setQueue(q => [...q, ...fresh]);
        }
      } catch { /* server not ready yet */ }
    }

    poll();
    const t = setInterval(poll, 1500);
    return () => clearInterval(t);
  }, []);

  function dismiss() { setQueue(q => q.slice(1)); }

  function triggerTest(type: PerfAlarm['type']) {
    const testMessages = {
      positive: 'Clean tack — best time this regatta',
      negative: 'Activate diff now — speed above 25',
      neutral:  'Turn diff OFF — speed below 18',
    };
    const alarm: PerfAlarm = { id: `test-${Date.now()}`, type, message: testMessages[type] };
    seenIds.current.add(alarm.id);
    setQueue(q => [...q, alarm]);
  }

  return { current: queue[0] ?? null, dismiss, triggerTest };
}

// ── Main component ────────────────────────────────────────────

// ── Mini capture widget ───────────────────────────────────────

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    SpeechRecognition: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    webkitSpeechRecognition: any;
  }
}

type CapturePhase = 'closed' | 'recording' | 'saved';

function MiniCapture() {
  const [phase, setPhase] = useState<CapturePhase>('closed');
  const [text, setText] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recRef = useRef<any>(null);

  function startRec() {
    setText('');
    setPhase('recording');
    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      let final = '';
      for (let i = 0; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript + ' ';
      }
      if (final.trim()) setText(final.trim());
    };
    rec.start();
    recRef.current = rec;
  }

  function stopRec() {
    recRef.current?.stop();
    recRef.current = null;
    const saved = text.trim();
    if (saved) {
      const ts = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      addCapture({
        id: `capture-live-${Date.now()}`,
        source: 'capture',
        regatta: '',
        race: '',
        team: '',
        title: `Live note · ${ts}`,
        duration: '—',
        lines: [{ speaker: 'Live', text: saved }],
      });
    }
    setPhase('saved');
    setTimeout(() => { setPhase('closed'); setText(''); }, 1800);
  }

  if (phase === 'closed') {
    return (
      <button onClick={startRec} className="lm-cap-fab" aria-label="Start quick capture">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
          <line x1="12" y1="19" x2="12" y2="23"/>
          <line x1="8" y1="23" x2="16" y2="23"/>
        </svg>
        Capture
      </button>
    );
  }

  if (phase === 'saved') {
    return (
      <div className="lm-cap-fab lm-cap-fab--saved">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        Saved
      </div>
    );
  }

  return (
    <div className="lm-cap-panel">
      <div className="lm-cap-pulse" />
      <div className="lm-cap-text">{text || 'Listening…'}</div>
      <button onClick={stopRec} className="lm-cap-stop">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
        </svg>
        Stop &amp; save
      </button>
    </div>
  );
}

export default function LiveMode({ regatId, dayIndex, venueCity, venueLat, venueLon, venueTimezone, selectedDate, onExit, renderContent }: Props) {
  const [now, setNow] = useState(() => new Date());
  const [alarmBlock, setAlarmBlock] = useState<Block | null>(null);
  const { current: perfAlarm, dismiss: dismissPerfAlarm, triggerTest } = usePerfAlarms();
  const [peekBlockId, setPeekBlockId] = useState<string | null>(null);
  const userPickedRef = useRef(false); // true when user manually selected a block
  const prevNowIdRef = useRef<string | null>(null);

  // Tick every second
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Listen for Escape / fullscreenchange
  useEffect(() => {
    function onFsChange() {
      if (!document.fullscreenElement) onExit();
    }
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, [onExit]);

  const blocks = getBlocks(now, regatId, dayIndex, venueTimezone);
  const nowBlock = blocks.find(b => b.status === 'now') ?? null;
  const futureBlocks = blocks.filter(b => b.status === 'future');
  const tZeroBlock = blocks.find(b => b.tZeroOffset === 0) ?? null;

  // Auto-open current block content; follow it when it advances (unless user picked something else)
  useEffect(() => {
    const id = nowBlock?.id ?? null;
    const changed = prevNowIdRef.current !== null && id !== prevNowIdRef.current;
    prevNowIdRef.current = id;

    if (!userPickedRef.current || changed) {
      // New block started → always follow it and clear user pick
      if (changed) userPickedRef.current = false;
      if (id) setPeekBlockId(id);
    }
  }, [nowBlock?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Alarm on block transition
  useEffect(() => {
    if (prevNowIdRef.current !== null && nowBlock && prevNowIdRef.current !== nowBlock.id) {
      setAlarmBlock(nowBlock);
    }
  }, [nowBlock?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function handlePickBlock(id: string) {
    userPickedRef.current = true;
    setPeekBlockId(peekBlockId === id ? null : id);
  }

  const dismissAlarm = useCallback(() => setAlarmBlock(null), []);

  const handleExit = useCallback(async () => {
    if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
    onExit();
  }, [onExit]);

  const peekBlock = peekBlockId ? blocks.find(b => b.id === peekBlockId) : null;

  // Show race view when the peeked block (or current nowBlock) has no content
  const activeDisplayBlock = peekBlock ?? nowBlock;
  const showRaceView = !!(activeDisplayBlock && activeDisplayBlock.panel === 'future');

  // T-Zero for the selected race block (falls back to the canonical T-Zero block)
  const clockBlock = (peekBlock?.panel === 'future' ? peekBlock : null) ?? tZeroBlock;

  // T-Zero ticker — tracks selected race block, falls back to canonical T-Zero
  const ticker = clockBlock ? formatTicker(secsRelTZeroTZ(clockBlock.time, now, venueTimezone)) : null;

  // Countdown to next block
  function minsUntil(time: string): number {
    const [h, m] = time.split(':').map(Number);
    const { h: nowH, m: nowM } = getVenueHM(now, venueTimezone);
    return Math.max(0, (h * 60 + m) - (nowH * 60 + nowM));
  }

  return (
    <div className="lm-root">

      {/* Header — always static */}
      <div className="lm-header">
        <div className="lm-header-left">
          <img src="/images/logo/team_logo.png" alt="Ginga" className="lm-logo" />
          <span className="lm-venue">{venueCity.toUpperCase()} · RACE DAY</span>
        </div>
        {ticker && (
          <div className={`lm-tzero${ticker.elapsed ? ' elapsed' : ''}`}>
            <span className="lm-tzero-label">{ticker.elapsed ? 'T+' : 'T–'}</span>
            <span className="lm-tzero-value">{ticker.label.replace(/^[+-]/, '')}</span>
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Test alarm buttons — remove when Viktor's server is live */}
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.1em', textTransform: 'uppercase', marginRight: 2 }}>TEST</span>
            {(['positive', 'negative', 'neutral'] as const).map(type => (
              <button
                key={type}
                onClick={() => triggerTest(type)}
                style={{
                  padding: '3px 8px', borderRadius: 5, border: 'none', cursor: 'pointer',
                  fontSize: 10, fontWeight: 700, fontFamily: 'inherit',
                  background: type === 'positive' ? '#1a6b38' : type === 'negative' ? '#6b1a1a' : '#3d3010',
                  color: type === 'positive' ? '#00c84a' : type === 'negative' ? '#ff4444' : '#b07800',
                }}
              >
                {type === 'positive' ? '✓' : type === 'negative' ? '✕' : '!'}
              </button>
            ))}
          </div>
          <button className="lm-exit" onClick={handleExit} aria-label="Exit live mode">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <line x1="2" y1="2" x2="14" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <line x1="14" y1="2" x2="2" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Exit
          </button>
        </div>
      </div>

      {/* Body: current/content + upcoming — side by side in landscape */}
      <div className="lm-body">

        {/* Block content — takes over the center when open */}
        {peekBlock && !showRaceView ? (
          <div className="lm-content-panel">
            <div className="lm-content-body">
              {renderContent(peekBlock.id)}
            </div>
          </div>
        ) : showRaceView ? (
          /* ── Race action view — clean elapsed timer ── */
          <div className="lm-race-view">
            {activeDisplayBlock?.tag && <div className="lm-race-tag">{activeDisplayBlock.tag}</div>}
            <div className="lm-race-name">{activeDisplayBlock?.name?.replace('🏁 ', '') ?? ''}</div>
            {ticker && (
              <div className={`lm-race-ticker${ticker.elapsed ? ' elapsed' : ''}`}>
                {ticker.elapsed ? '+' : '–'}{ticker.label.replace(/^[+]/, '')}
              </div>
            )}
            <div className="lm-race-hint">tap a block below to switch</div>
          </div>
        ) : (
          /* Current block — big display when nothing selected */
          <div
            className={`lm-current${nowBlock && nowBlock.panel !== 'future' ? ' lm-clickable' : ''}`}
            onClick={nowBlock && nowBlock.panel !== 'future' ? () => setPeekBlockId(nowBlock.id) : undefined}
          >
            {nowBlock ? (
              <>
                <div className="lm-now-eyebrow">
                  NOW · {nowBlock.time}
                  {nowBlock.tag && <span className="lm-now-tag" style={{ color: nowBlock.tagColor || 'var(--green)' }}>{nowBlock.tag}</span>}
                </div>
                <div className="lm-now-name">{nowBlock.name}</div>
                <div className="lm-peek-hint">tap to see details</div>
              </>
            ) : (
              <>
                <div className="lm-now-eyebrow">SCHEDULE</div>
                <div className="lm-now-name" style={{ opacity: 0.4 }}>No active block</div>
              </>
            )}
          </div>
        )}

        {/* Upcoming strip — NOW block first, then all future, horizontal scroll */}
        {(nowBlock || futureBlocks.length > 0) && (
          <div className="lm-upcoming-row">
            <div className="lm-strip">
              {/* NOW entry */}
              {nowBlock && (
                <div
                  className={`lm-strip-item lm-strip-now lm-clickable${peekBlockId === nowBlock.id ? ' lm-peeking' : ''}`}
                  onClick={() => handlePickBlock(nowBlock.id)}
                >
                  <div className="lm-strip-time lm-strip-now-label">● NOW</div>
                  <div className="lm-strip-name">{nowBlock.name}</div>
                </div>
              )}
              {/* Future entries */}
              {futureBlocks.map((b, i) => (
                <div
                  key={b.id}
                  className={`lm-strip-item lm-clickable${peekBlockId === b.id ? ' lm-peeking' : ''}${i === 0 ? ' lm-strip-next' : ''}`}
                  onClick={() => handlePickBlock(b.id)}
                >
                  <div className="lm-strip-time">
                    {b.time}
                    {i === 0 && minsUntil(b.time) > 0 && <span className="lm-next-in"> · {minsUntil(b.time)}m</span>}
                  </div>
                  <div className="lm-strip-name">{b.name}</div>
                  {b.tag && <div className="lm-strip-tag" style={{ color: b.tagColor || 'var(--text4)' }}>{b.tag}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Conditions */}
      <ConditionsBar lat={venueLat} lon={venueLon} date={selectedDate} />

      {/* Quick capture FAB */}
      <MiniCapture />

      {/* Schedule block alarm */}
      {alarmBlock && <AlarmOverlay block={alarmBlock} onDismiss={dismissAlarm} />}

      {/* Performance alarm from Viktor's server */}
      {perfAlarm && !alarmBlock && <PerfAlarmOverlay alarm={perfAlarm} onDismiss={dismissPerfAlarm} />}
    </div>
  );
}
