import { useState, useEffect } from 'react';
import { BLOCKS } from '../../data/blocks';
import type { Block } from '../../types';
import { useTheme } from '../../context/ThemeContext';

interface Props {
  selectedId: string;
  onSelect: (id: string) => void;
}

export default function Timeline({ selectedId, onSelect }: Props) {
  const [countdown, setCountdown] = useState(23 * 60 + 18);

  useEffect(() => {
    const t = setInterval(() => {
      setCountdown(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const mm = String(Math.floor(countdown / 60)).padStart(2, '0');
  const ss = String(countdown % 60).padStart(2, '0');

  return (
    <div className="tl">
      <div className="tl-top">
        <div className="tl-eyebrow">Race Day 1</div>
        <div className="tl-day">São Paulo</div>
        <div className="tl-sub">12 Mar 2026</div>
        <WeatherPanel />
      </div>
      <div className="tl-list">
        {BLOCKS.map(block => (
          <TimelineItem
            key={block.id}
            block={block}
            selected={selectedId === block.id}
            countdown={`00:${mm}:${ss}`}
            onClick={() => onSelect(block.id)}
          />
        ))}
      </div>
    </div>
  );
}

/* ── Wind direction arrow — rotates to bearing ── */
function WindArrow({ bearing }: { bearing: number }) {
  return (
    <svg
      width="28" height="28" viewBox="0 0 28 28"
      style={{ transform: `rotate(${bearing}deg)`, flexShrink: 0 }}
    >
      {/* Compass circle */}
      <circle cx="14" cy="14" r="12" fill="none" stroke="var(--line2)" strokeWidth="1" />
      {/* Arrow shaft */}
      <line x1="14" y1="20" x2="14" y2="8" stroke="var(--green)" strokeWidth="1.5" strokeLinecap="round" />
      {/* Arrowhead */}
      <polygon points="14,5 11,10 17,10" fill="var(--green)" />
      {/* Tail dot */}
      <circle cx="14" cy="21" r="1.5" fill="var(--text4)" />
    </svg>
  );
}

const CONDITIONS = [
  { id: 'overcast', label: 'Overcast', wind: '10–12', theme: 'dark'  as const },
  { id: 'sunny',    label: 'Sunny',    wind: '14–18', theme: 'light' as const },
  { id: 'stormy',   label: 'Storm',    wind: '22–28', theme: 'dark'  as const },
];

function WeatherPanel() {
  const { setTheme } = useTheme();
  const [condIdx, setCondIdx] = useState(0);
  const cond = CONDITIONS[condIdx];
  const windBearing = 202;
  const isSunny = cond.id === 'sunny';

  function cycle() {
    const next = (condIdx + 1) % CONDITIONS.length;
    setCondIdx(next);
    setTheme(CONDITIONS[next].theme);
  }

  return (
    <div style={{
      marginTop: 14,
      paddingTop: 12,
      borderTop: '1px solid var(--line)',
      position: 'relative',
      overflow: 'hidden',
      cursor: 'pointer',
    }} onClick={cycle} title="Click to change conditions">

      {/* Background sky illustration */}
      <svg
        viewBox="0 0 202 120"
        width="202" height="120"
        style={{
          position: 'absolute', top: 0, right: -10,
          opacity: isSunny ? 0.45 : 0.10,
          pointerEvents: 'none',
          transition: 'opacity 0.4s',
        }}
        aria-hidden
      >
        {/* Sun */}
        <circle cx="158" cy="30" r={isSunny ? 30 : 22} fill="#FEDD00" style={{ transition: 'r 0.4s' }} />
        {Array.from({ length: 10 }).map((_, i) => {
          const angle = (i * 36 * Math.PI) / 180;
          const r1 = isSunny ? 34 : 26;
          const r2 = isSunny ? 44 : 34;
          return (
            <line key={i}
              x1={158 + Math.cos(angle) * r1} y1={30 + Math.sin(angle) * r1}
              x2={158 + Math.cos(angle) * r2} y2={30 + Math.sin(angle) * r2}
              stroke="#FEDD00" strokeWidth="2.5" strokeLinecap="round"
            />
          );
        })}
        {/* Clouds — hidden when sunny */}
        {!isSunny && <>
          <ellipse cx="110" cy="52" rx="55" ry="22" fill="white" />
          <ellipse cx="138" cy="44" rx="36" ry="18" fill="white" />
          <ellipse cx="85"  cy="48" rx="30" ry="16" fill="white" />
          <ellipse cx="162" cy="54" rx="28" ry="14" fill="white" />
          <ellipse cx="50"  cy="78" rx="42" ry="16" fill="white" />
          <ellipse cx="76"  cy="70" rx="28" ry="14" fill="white" />
          <ellipse cx="28"  cy="74" rx="22" ry="12" fill="white" />
        </>}
        {/* Rain on storm */}
        {cond.id === 'stormy' && [30, 44, 58, 70, 84, 96].map((x, i) => (
          <line key={i} x1={x} y1={90} x2={x - 5} y2={110} stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
        ))}
      </svg>
      {/* Wind — primary stat */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <WindArrow bearing={windBearing} />
        <div>
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 800, fontSize: 26, lineHeight: 1,
            color: 'var(--text)', letterSpacing: '-0.01em',
          }}>
            {cond.wind}
            <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text3)', marginLeft: 3 }}>kts</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <span style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 12, fontWeight: 700, letterSpacing: '0.08em',
              color: 'var(--green)',
            }}>SSW</span>
            <span style={{ fontSize: 11, color: 'var(--text4)' }}>
              {cond.id === 'stormy' ? 'gusty' : 'steady'}
            </span>
          </div>
        </div>
      </div>

      {/* Secondary conditions row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 0' }}>
        <CondItem label="Course" value="Course 2" color="var(--yellow)" />
        <CondItem label="Temp" value={isSunny ? '32°C' : '28°C'} />
        <CondItem
          label="Gusts"
          value={cond.id === 'stormy' ? '34 kts' : isSunny ? '20 kts' : '14 kts'}
          color={cond.id === 'stormy' ? 'var(--red)' : 'var(--yellow)'}
        />
        <CondItem label="Sky" value={cond.label} color={isSunny ? 'var(--yellow)' : undefined} />
      </div>

      {/* Click hint */}
      <div style={{ marginTop: 8, fontSize: 10, color: 'var(--text4)', letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: "'Barlow Condensed', sans-serif" }}>
        tap to change conditions
      </div>

    </div>
  );
}

function CondItem({ label, value, color }: { label: string; value: string; color?: string }) {
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

  return (
    <div className={classes} id={`tl-${block.id}`} onClick={onClick}>
      <div className="tl-time">{block.time}</div>
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
