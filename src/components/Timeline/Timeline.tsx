'use client';

import { useState, useEffect, useRef } from 'react';
import { getBlocks } from '@/data/blocks';
import type { Block } from '@/types';

interface Props {
  selectedId: string;
  onSelect: (id: string) => void;
  renderExpanded?: (blockId: string) => React.ReactNode;
  venueLat?: number;
  venueLon?: number;
  venueCity?: string;
}

function formatTZero(offset: number): string {
  const abs = Math.abs(offset);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  if (offset === 0) return 'T–0';
  if (offset > 0) return `T+${h > 0 ? `${h}h ` : ''}${m > 0 ? `${m}m` : ''}`.trim();
  return `T–${h > 0 ? `${h}h ` : ''}${m > 0 ? `${m}m` : ''}`.trim();
}

function DemoBadge() {
  return (
    <span style={{
      fontFamily: "'Barlow Condensed', sans-serif",
      fontSize: 9, fontWeight: 700, letterSpacing: '0.14em',
      textTransform: 'uppercase', padding: '2px 6px', borderRadius: 3,
      background: 'var(--yg)', border: '1px solid var(--yb)', color: 'var(--yellow)',
    }}>DEMO</span>
  );
}

function useNow(intervalMs = 10000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

function secsUntil(targetTime: string, now: Date): number {
  const [h, m] = targetTime.split(':').map(Number);
  const target = new Date(now);
  target.setHours(h, m, 0, 0);
  return Math.max(0, Math.floor((target.getTime() - now.getTime()) / 1000));
}

export default function Timeline({ selectedId, onSelect, renderExpanded, venueLat, venueLon, venueCity }: Props) {
  const now = useNow();
  const blocks = getBlocks(now);
  const listRef = useRef<HTMLDivElement>(null);

  const tZeroBlock = blocks.find(b => b.tZeroOffset === 0);
  const [secsToTZero, setSecsToTZero] = useState(() =>
    tZeroBlock ? secsUntil(tZeroBlock.time, now) : 0
  );

  useEffect(() => {
    const t = setInterval(() => {
      if (tZeroBlock) setSecsToTZero(secsUntil(tZeroBlock.time, new Date()));
    }, 1000);
    return () => clearInterval(t);
  }, [tZeroBlock]);

  // Scroll "now" block into view on mount and whenever it changes
  useEffect(() => {
    const nowBlock = blocks.find(b => b.status === 'now');
    if (!nowBlock || !listRef.current) return;
    const el = listRef.current.querySelector(`#tl-${nowBlock.id}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocks.find(b => b.status === 'now')?.id]);

  const totalSecs = secsToTZero;
  const hh = String(Math.floor(totalSecs / 3600)).padStart(2, '0');
  const mm = String(Math.floor((totalSecs % 3600) / 60)).padStart(2, '0');
  const ss = String(totalSecs % 60).padStart(2, '0');
  const countdownStr = `${hh}:${mm}:${ss}`;

  return (
    <div className="tl">
      <div className="tl-top">
        <div className="tl-eyebrow">Race Day 1 · Season 6</div>
        <div className="tl-day">{venueCity ?? 'Event'}</div>
        <div className="tl-sub">{venueCity ? `${venueCity} SailGP · 2026` : 'SailGP · 2026'}</div>
        <WeatherPanel lat={venueLat} lon={venueLon} city={venueCity} />
        <EquipmentPanel />
      </div>
      <div className="tl-list" ref={listRef}>
        {blocks.map(block => (
          <div key={block.id}>
            <TimelineItem
              block={block}
              selected={selectedId === block.id}
              countdown={countdownStr}
              onClick={() => onSelect(block.id)}
            />
            {renderExpanded && selectedId === block.id && (
              <div style={{
                borderLeft: '2px solid var(--green)',
                marginLeft: 12,
                marginBottom: 4,
                background: 'var(--bg2)',
                borderRadius: '0 8px 8px 0',
                overflow: 'hidden',
              }}>
                {renderExpanded(block.id)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function WindArrow({ bearing }: { bearing: number }) {
  return (
    <svg
      width="28" height="28" viewBox="0 0 28 28"
      style={{ transform: `rotate(${bearing}deg)`, flexShrink: 0 }}
    >
      <circle cx="14" cy="14" r="12" fill="none" stroke="var(--line2)" strokeWidth="1" />
      <line x1="14" y1="20" x2="14" y2="8" stroke="var(--green)" strokeWidth="1.5" strokeLinecap="round" />
      <polygon points="14,5 11,10 17,10" fill="var(--green)" />
      <circle cx="14" cy="21" r="1.5" fill="var(--text4)" />
    </svg>
  );
}

interface WeatherData {
  wind: number;
  gusts: number;
  bearing: number;
  temp: number;
  sky: string;
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
  if (code <= 77) return 'Snow';
  if (code <= 82) return 'Showers';
  return 'Thunderstorm';
}

function WeatherPanel({ lat, lon, city }: { lat?: number; lon?: number; city?: string }) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [fetching, setFetching] = useState(false);
  const [updatedAt, setUpdatedAt] = useState('');

  useEffect(() => {
    if (!lat || !lon) return;
    let cancelled = false;
    setFetching(true);
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=wind_speed_10m,wind_gusts_10m,wind_direction_10m,temperature_2m,weather_code` +
      `&wind_speed_unit=kn&timezone=auto`
    )
      .then(r => r.json())
      .then(d => {
        if (cancelled) return;
        const c = d.current;
        setWeather({
          wind:    Math.round(c.wind_speed_10m),
          gusts:   Math.round(c.wind_gusts_10m),
          bearing: Math.round(c.wind_direction_10m),
          temp:    Math.round(c.temperature_2m),
          sky:     wmoToSky(c.weather_code),
        });
        setUpdatedAt(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setFetching(false); });
    return () => { cancelled = true; };
  }, [lat, lon]);

  return (
    <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--line)', transition: 'opacity 0.3s', opacity: fetching ? 0.5 : 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--text4)' }}>
          Conditions · {city ?? 'Venue'}
        </div>
        {updatedAt && <div style={{ fontSize: 10, color: 'var(--text4)' }}>Updated {updatedAt}</div>}
      </div>

      {!weather ? (
        <div style={{ fontSize: 12, color: 'var(--text4)', padding: '8px 0' }}>
          {fetching ? 'Loading…' : 'Could not load conditions'}
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <WindArrow bearing={weather.bearing} />
            <div>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 26, lineHeight: 1, color: 'var(--text)', letterSpacing: '-0.01em' }}>
                {weather.wind}
                <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text3)', marginLeft: 3 }}>kts</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--green)' }}>
                  {bearingToCardinal(weather.bearing)}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text4)' }}>{weather.sky}</span>
              </div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 0' }}>
            <CondItem label="Temp"  value={`${weather.temp}°C`} />
            <CondItem label="Sky"   value={weather.sky} />
            <CondItem label="Gusts" value={`${weather.gusts} kts`} color={weather.gusts > 25 ? 'var(--red)' : weather.gusts > 18 ? 'var(--yellow)' : undefined} />
            <CondItem label="Dir"   value={`${weather.bearing}°`} />
          </div>
        </>
      )}
    </div>
  );
}

function CondItem({ label, value, color }: { label: string; value: React.ReactNode; color?: string }) {
  return (
    <div>
      <div style={{
        fontFamily: "'Barlow Condensed', sans-serif",
        fontSize: 9, fontWeight: 700, letterSpacing: '0.16em',
        textTransform: 'uppercase', color: 'var(--text4)', marginBottom: 1,
      }}>{label}</div>
      <div style={{
        fontFamily: "'Barlow Condensed', sans-serif",
        fontSize: 14, fontWeight: 700,
        color: color ?? 'var(--text2)',
      }}>{value}</div>
    </div>
  );
}

function EquipmentPanel() {
  return (
    <div className="eq-section">
      <div className="eq-title">Equipment Config</div>
      <div style={{ fontSize: 12, color: 'var(--text4)', lineHeight: 1.6 }}>
        Equipment selection will appear here when configured for the event.
      </div>
    </div>
  );
}

function TimelineItem({ block, selected, countdown, onClick }: {
  block: Block;
  selected: boolean;
  countdown: string;
  onClick: () => void;
}) {
  const classes = [
    'tl-item',
    block.status === 'past' ? 'past' : '',
    block.status === 'now' ? 'now' : '',
    selected ? 'sel' : '',
  ].filter(Boolean).join(' ');

  const showTZero = block.status !== 'past' && block.tZeroOffset !== undefined;
  const isRaceStart = block.tZeroOffset === 0;

  return (
    <div className={classes} id={`tl-${block.id}`} onClick={onClick}>
      <div style={{ minWidth: 38, marginTop: 1 }}>
        <div className="tl-time">{block.time}</div>
        {showTZero && (
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
            color: isRaceStart ? 'var(--green)' : 'var(--text4)',
            marginTop: 2,
          }}>
            {formatTZero(block.tZeroOffset!)}
          </div>
        )}
      </div>
      <div className="tl-info">
        <div className="tl-name">{block.name}</div>
        {block.tag && (
          <div className="tl-tag" style={{ color: block.tagColor || 'var(--text3)' }}>
            {block.tag}
          </div>
        )}
        {block.status === 'now' && (
          <div className="tl-cd">
            <div className="pdot" />
            <div className="cd-txt">{countdown}</div>
          </div>
        )}
      </div>
    </div>
  );
}
