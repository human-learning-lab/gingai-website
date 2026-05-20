'use client';

import { useState } from 'react';
import LeftNav from '@/components/LeftNav/LeftNav';
import { getTranscripts, type Transcript } from '@/data/transcripts';

const ALL_REGATTAS = ['All', 'Perth', 'Auckland', 'Sydney', 'Rio', 'Bermuda'];
const TEAM_FLAGS: Record<string, string> = {
  AUS: '🇦🇺', BRA: '🇧🇷', CAN: '🇨🇦', DEN: '🇩🇰', ESP: '🇪🇸',
  FRA: '🇫🇷', GBR: '🇬🇧', GER: '🇩🇪', ITA: '🇮🇹', JPN: '🇯🇵',
  NZL: '🇳🇿', SUI: '🇨🇭', UAE: '🇦🇪', USA: '🇺🇸',
};

const TEAM_COLORS: Record<string, string> = {
  GBR: '#012169', AUS: '#00843D', NZL: '#000', FRA: '#002395',
  USA: '#B22234', BRA: '#009C3B', SUI: '#FF0000', DEN: '#C60C30',
  ESP: '#AA151B', CAN: '#FF0000',
};

function highlight(text: string, q: string) {
  if (!q) return text;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: 'rgba(0,155,58,0.25)', borderRadius: 2, padding: '0 1px' }}>
        {text.slice(idx, idx + q.length)}
      </mark>
      {text.slice(idx + q.length)}
    </>
  );
}

function TranscriptCard({ t, expanded, onToggle, searchQuery }: {
  t: Transcript;
  expanded: boolean;
  onToggle: () => void;
  searchQuery: string;
}) {
  const preview = t.lines.slice(0, 2);
  const rest = t.lines.slice(2);

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid var(--line)',
        borderRadius: 10,
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'box-shadow 0.15s',
        boxShadow: expanded ? '0 2px 12px rgba(10,22,40,0.10)' : '0 1px 3px rgba(10,22,40,0.05)',
      }}
      onClick={onToggle}
    >
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{
          flexShrink: 0, width: 36, height: 36, borderRadius: 6,
          background: TEAM_COLORS[t.team] ?? 'var(--navy)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontFamily: "'Barlow Condensed', sans-serif",
          fontWeight: 800, fontSize: 13, letterSpacing: '0.05em',
        }}>
          {t.team}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>{t.regatta} · {t.race}</span>
            <span style={{
              fontSize: 10, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
              letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text4)',
              background: 'var(--bg3)', borderRadius: 3, padding: '1px 6px',
            }}>{t.title}</span>
            <span style={{ fontSize: 11, color: 'var(--text4)', marginLeft: 'auto' }}>{t.duration}</span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text3)', lineHeight: 1.5 }}>
            {preview.map((line, i) => (
              <div key={i} style={{ marginBottom: 3 }}>
                <span style={{ fontWeight: 600, color: 'var(--text2)' }}>{line.speaker}: </span>
                <span style={{ color: expanded ? 'var(--text2)' : 'var(--text3)' }}>
                  {!expanded && i === preview.length - 1 && rest.length > 0
                    ? highlight(line.text.slice(0, 80) + '…', searchQuery)
                    : highlight(line.text, searchQuery)}
                </span>
              </div>
            ))}
          </div>
        </div>
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="var(--text4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{ flexShrink: 0, marginTop: 2, transition: 'transform 0.2s', transform: expanded ? 'rotate(180deg)' : 'none' }}
        >
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </div>

      {expanded && rest.length > 0 && (
        <div style={{ borderTop: '1px solid var(--line)', padding: '12px 16px 14px 64px' }}>
              {rest.map((line, i) => (
            <div key={i} style={{ marginBottom: 10, fontSize: 13, lineHeight: 1.6 }}>
              <span style={{ fontWeight: 600, color: 'var(--text2)' }}>{line.speaker}: </span>
              <span style={{ color: 'var(--text2)' }}>{highlight(line.text, searchQuery)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Transcripts() {
  const [regatta, setRegatta] = useState('All');
  const [race, setRace] = useState('All');
  const [team, setTeam] = useState('All');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const all = getTranscripts();

  const availableRaces = regatta === 'All'
    ? []
    : ['All', ...Array.from(new Set(all.filter(t => t.regatta === regatta).map(t => t.race))).sort()];

  const q = search.trim().toLowerCase();
  const filtered = all.filter(t => {
    if (regatta !== 'All' && t.regatta !== regatta) return false;
    if (race !== 'All' && t.race !== race) return false;
    if (team !== 'All' && t.team !== team) return false;
    if (q) {
      const inText = t.lines.some(l =>
        l.text.toLowerCase().includes(q) || l.speaker.toLowerCase().includes(q)
      );
      if (!inText) return false;
    }
    return true;
  });

  const allTeams = ['All', ...Object.keys(TEAM_FLAGS).sort()];

  return (
    <div className="s-backbone">
      <LeftNav />
      <div className="main" style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px 24px 0', flexShrink: 0 }}>
          <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>
            Season 6 · 2026
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)' }}>
              Race Transcripts
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, flex: 1, maxWidth: 280,
              background: '#fff', border: '1.5px solid var(--line)', borderRadius: 8,
              padding: '0 12px', height: 36,
              boxShadow: '0 1px 3px rgba(10,22,40,0.05)',
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text4)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search transcripts…"
                style={{
                  flex: 1, border: 'none', outline: 'none', background: 'transparent',
                  fontSize: 13, color: 'var(--text)', fontFamily: 'inherit',
                }}
              />
              {search && (
                <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text4)', padding: 0, lineHeight: 1 }}>
                  ✕
                </button>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, marginBottom: 6 }}>
            {ALL_REGATTAS.map(r => (
              <button
                key={r}
                onClick={() => { setRegatta(r); setRace('All'); }}
                style={{
                  flexShrink: 0, padding: '5px 12px', borderRadius: 20,
                  border: '1px solid', cursor: 'pointer', fontSize: 13, fontWeight: 500,
                  fontFamily: 'inherit', transition: 'all 0.12s',
                  background: regatta === r ? 'var(--navy)' : 'var(--bg2)',
                  borderColor: regatta === r ? 'var(--navy)' : 'var(--line)',
                  color: regatta === r ? '#fff' : 'var(--text2)',
                }}
              >
                {r}
              </button>
            ))}
          </div>

          {availableRaces.length > 0 && (
            <div style={{ display: 'flex', gap: 6, paddingBottom: 6, marginBottom: 4 }}>
              {availableRaces.map(r => (
                <button
                  key={r}
                  onClick={() => setRace(r)}
                  style={{
                    flexShrink: 0, padding: '3px 10px', borderRadius: 20,
                    border: '1px solid', cursor: 'pointer', fontSize: 12, fontWeight: 500,
                    fontFamily: 'inherit', transition: 'all 0.12s',
                    background: race === r ? 'var(--green)' : 'var(--bg2)',
                    borderColor: race === r ? 'var(--green)' : 'var(--line)',
                    color: race === r ? '#fff' : 'var(--text3)',
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8, marginBottom: 4 }}>
            {allTeams.map(t => (
              <button
                key={t}
                onClick={() => setTeam(t)}
                style={{
                  flexShrink: 0, padding: '4px 10px', borderRadius: 20,
                  border: '1px solid', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                  fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.06em',
                  textTransform: 'uppercase', transition: 'all 0.12s',
                  background: team === t ? (TEAM_COLORS[t] ?? 'var(--navy)') : 'var(--bg2)',
                  borderColor: team === t ? (TEAM_COLORS[t] ?? 'var(--navy)') : 'var(--line)',
                  color: team === t ? '#fff' : 'var(--text2)',
                }}
              >
                {TEAM_FLAGS[t] ? `${TEAM_FLAGS[t]} ${t}` : t}
              </button>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 24px 24px' }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text4)', fontSize: 14 }}>
              No transcripts for this selection
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 12, color: 'var(--text4)', marginBottom: 2 }}>
                {filtered.length} transcript{filtered.length !== 1 ? 's' : ''}
              </div>
              {filtered.map(t => (
                <TranscriptCard
                  key={t.id}
                  t={t}
                  expanded={expandedId === t.id}
                  onToggle={() => setExpandedId(expandedId === t.id ? null : t.id)}
                  searchQuery={q}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
