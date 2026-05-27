'use client';

import { useState, useEffect } from 'react';
import { getTideNow } from '@/data/tides';

// ── Wind direction arrow ──────────────────────────────────────

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

function TideArrow({ dir }: { dir: number }) {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" style={{ transform: `rotate(${dir}deg)`, flexShrink: 0 }}>
      <circle cx="14" cy="14" r="13" fill="none" stroke="var(--line)" strokeWidth="1"/>
      <polygon points="14,4 17,14 14,12 11,14" fill="var(--navy)" />
      <line x1="14" y1="12" x2="14" y2="22" stroke="var(--navy)" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
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

// ── Weather panel ─────────────────────────────────────────────

interface WeatherData {
  wind: number;
  gusts: number;
  bearing: number;
  temp: number;
  sky: string;
}

export function WeatherPanel({ lat, lon, city }: { lat?: number; lon?: number; city?: string }) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [fetching, setFetching] = useState(false);
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [updatedAt, setUpdatedAt] = useState('');

  useEffect(() => {
    if (!lat || !lon) return;
    let cancelled = false;
    setFetching(true);
    const skeletonTimer = setTimeout(() => {
      if (!cancelled) setShowSkeleton(true);
    }, 160);
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
      .finally(() => {
        if (!cancelled) {
          clearTimeout(skeletonTimer);
          setShowSkeleton(false);
          setFetching(false);
        }
      });
    return () => { cancelled = true; clearTimeout(skeletonTimer); };
  }, [lat, lon]);

  const skeletonBar = (w: string, h = 10, mt = 0) => (
    <div className="wx-skel" style={{ width: w, height: h, marginTop: mt }} />
  );

  return (
    <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--line)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--text4)' }}>
          Conditions · {city ?? 'Venue'}
        </div>
        {updatedAt && <div style={{ fontSize: 10, color: 'var(--text4)' }}>Updated {updatedAt}</div>}
      </div>

      {showSkeleton && !weather ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div className="wx-skel" style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0 }} />
            <div>
              {skeletonBar('52px', 26)}
              {skeletonBar('80px', 10, 6)}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 0' }}>
            {['40px', '56px', '48px', '36px'].map((w, i) => (
              <div key={i}>
                {skeletonBar('28px', 7)}
                {skeletonBar(w, 13, 3)}
              </div>
            ))}
          </div>
        </>
      ) : !weather ? null : (
        <div
          key={`${weather.wind}-${weather.bearing}`}
          className="wx-loaded"
          style={{ opacity: fetching ? 0.5 : 1, transition: 'opacity 0.25s' }}
        >
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
        </div>
      )}
    </div>
  );
}

// ── Tide panel ────────────────────────────────────────────────

export function TidePanel({ date }: { date?: Date }) {
  const [tide, setTide] = useState(() => getTideNow(date ?? new Date()));

  useEffect(() => {
    setTide(getTideNow(date ?? new Date()));
    if (date) return; // only auto-refresh for live (today) view
    const t = setInterval(() => setTide(getTideNow(new Date())), 60_000);
    return () => clearInterval(t);
  }, [date]);

  if (!tide) return null;

  const dirLabel = tide.dir === 30 ? '030°' : '205°';

  return (
    <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--line)' }}>
      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--text4)', marginBottom: 8 }}>
        Tidal Stream · Governors Is.
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <TideArrow dir={tide.dir} />
        <div>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 22, lineHeight: 1, color: 'var(--text)', letterSpacing: '-0.01em' }}>
            {tide.speed.toFixed(1)}
            <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text3)', marginLeft: 3 }}>kn</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text4)', marginTop: 2 }}>{dirLabel} · Admiralty</div>
        </div>
      </div>
      {tide.turningAt && (
        <div style={{ fontSize: 11, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: 'var(--yellow)', flexShrink: 0 }} />
          Turning ~{tide.turningAt}
        </div>
      )}
    </div>
  );
}
