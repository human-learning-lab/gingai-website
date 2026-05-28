'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { getBlocks } from '@/data/blocks';
import { getTideNow } from '@/data/tides';
import type { Block } from '@/types';
import './LiveMode.css';

interface Props {
  regatId: string;
  dayIndex: number;
  venueCity: string;
  venueLat?: number;
  venueLon?: number;
  selectedDate: Date;
  onExit: () => void;
  renderContent: (blockId: string) => React.ReactNode;
}

// ── Helpers ───────────────────────────────────────────────────

function secsRelTZero(targetTime: string, now: Date): number {
  const [h, m] = targetTime.split(':').map(Number);
  const target = new Date(now);
  target.setHours(h, m, 0, 0);
  return Math.floor((now.getTime() - target.getTime()) / 1000);
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

// ── Alarm overlay ─────────────────────────────────────────────

function AlarmOverlay({ block, onDismiss }: { block: Block; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [onDismiss]);

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

// ── Main component ────────────────────────────────────────────

export default function LiveMode({ regatId, dayIndex, venueCity, venueLat, venueLon, selectedDate, onExit, renderContent }: Props) {
  const [now, setNow] = useState(() => new Date());
  const [alarmBlock, setAlarmBlock] = useState<Block | null>(null);
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

  const blocks = getBlocks(now, regatId, dayIndex);
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

  // T-Zero ticker
  const ticker = tZeroBlock ? formatTicker(secsRelTZero(tZeroBlock.time, now)) : null;

  // Countdown to next block
  function minsUntil(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return Math.max(0, (h * 60 + m) - (now.getHours() * 60 + now.getMinutes()));
  }

  const handleExit = useCallback(async () => {
    if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
    onExit();
  }, [onExit]);

  const peekBlock = peekBlockId ? blocks.find(b => b.id === peekBlockId) : null;

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
        {peekBlock ? (
          <div className="lm-content-panel">
            <div className="lm-content-body">
              {renderContent(peekBlock.id)}
            </div>
          </div>
        ) : (
          /* Current block — big display when nothing selected */
          <div
            className={`lm-current${nowBlock ? ' lm-clickable' : ''}`}
            onClick={nowBlock ? () => setPeekBlockId(nowBlock.id) : undefined}
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

      {/* Alarm overlay */}
      {alarmBlock && <AlarmOverlay block={alarmBlock} onDismiss={dismissAlarm} />}
    </div>
  );
}
