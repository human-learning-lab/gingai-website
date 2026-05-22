'use client';

import React, { useState, useRef, useEffect } from 'react';
import { getTranscripts, type Transcript, type TranscriptSource } from '@/data/transcripts';
import { getCaptured, subscribeCapture } from '@/data/captureStore';

const ALL_REGATTAS = ['All', 'Perth', 'Auckland', 'Sydney', 'Rio', 'Bermuda'];
const TEAM_FLAGS: Record<string, string> = {
  AUS: '🇦🇺', BRA: '🇧🇷', CAN: '🇨🇦', DEN: '🇩🇰', ESP: '🇪🇸',
  FRA: '🇫🇷', GBR: '🇬🇧', GER: '🇩🇪', ITA: '🇮🇹', JPN: '🇯🇵',
  NZL: '🇳🇿', SUI: '🇨🇭', UAE: '🇦🇪', USA: '🇺🇸',
};

const SOURCE_LABELS: Record<TranscriptSource, string> = {
  race:    'Race',
  capture: 'Capture',
  debrief: 'Debrief',
  upload:  'Upload',
};

const SOURCE_COLORS: Record<TranscriptSource, string> = {
  race:    'var(--navy)',
  capture: 'var(--red)',
  debrief: 'var(--green)',
  upload:  'var(--text3)',
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

const btnStyle: React.CSSProperties = {
  padding: '4px 12px', borderRadius: 6, border: '1px solid var(--line)',
  background: 'none', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', color: 'var(--text3)',
};
const iconBtnStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 5,
  padding: '4px 10px', borderRadius: 6, border: '1px solid var(--line)',
  background: 'none', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
  transition: 'all 0.1s',
};

function EditableLine({ speaker, text, editing, onUpdate }: {
  speaker: string;
  text: string;
  editing: boolean;
  onUpdate: (speaker: string, text: string) => void;
}) {
  const [spVal, setSpVal] = useState(speaker);
  const [txVal, setTxVal] = useState(text);

  // Sync if parent resets
  React.useEffect(() => { setSpVal(speaker); setTxVal(text); }, [speaker, text]);

  if (!editing) {
    return (
      <div style={{ marginBottom: 10, fontSize: 13, lineHeight: 1.6 }}>
        <span style={{ fontWeight: 600, color: 'var(--text2)' }}>{speaker}: </span>
        <span style={{ color: 'var(--text2)' }}>{text}</span>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 10, fontSize: 13, lineHeight: 1.6, display: 'flex', gap: 6, alignItems: 'flex-start' }}>
      <input
        value={spVal}
        onChange={e => { setSpVal(e.target.value); onUpdate(e.target.value, txVal); }}
        style={{
          fontWeight: 600, color: 'var(--text)', fontSize: 13, fontFamily: 'inherit',
          border: '1px solid var(--line)', borderRadius: 5, outline: 'none',
          background: 'var(--bg2)', padding: '2px 6px',
          width: `${Math.max(spVal.length + 2, 8)}ch`, flexShrink: 0,
        }}
      />
      <textarea
        value={txVal}
        onChange={e => { setTxVal(e.target.value); onUpdate(spVal, e.target.value); }}
        style={{
          flex: 1, fontSize: 13, fontFamily: 'inherit', lineHeight: 1.6,
          border: '1px solid var(--line)', borderRadius: 5, outline: 'none',
          background: 'var(--bg2)', padding: '2px 6px', resize: 'vertical',
          color: 'var(--text)', minHeight: 36,
        }}
      />
    </div>
  );
}

function TranscriptCard({ t, expanded, onToggle, onDelete, onUpdateLine, searchQuery }: {
  t: Transcript;
  expanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onUpdateLine: (lineIdx: number, speaker: string, text: string) => void;
  searchQuery: string;
}) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const preview = t.lines.slice(0, 2);
  const rest = t.lines.slice(2);

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid var(--line)',
        borderRadius: 10,
        overflow: 'hidden',
        transition: 'box-shadow 0.15s',
        boxShadow: expanded ? '0 2px 12px rgba(10,22,40,0.10)' : '0 1px 3px rgba(10,22,40,0.05)',
      }}
    >
      {/* Header row — click to expand */}
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer' }} onClick={onToggle}>
        <div style={{
          flexShrink: 0, width: 36, height: 36, borderRadius: 6,
          background: 'var(--bg3)', overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, lineHeight: 1,
        }}>
          {t.avatarUrl ? (
            <img src={t.avatarUrl} alt={t.team} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            TEAM_FLAGS[t.team] ?? t.team
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>
              {t.source === 'race' ? `${t.regatta} · ${t.race}` : t.regatta || t.title}
            </span>
            <span style={{
              fontSize: 10, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
              letterSpacing: '0.1em', textTransform: 'uppercase',
              color: SOURCE_COLORS[t.source], background: 'var(--bg3)', borderRadius: 3, padding: '1px 6px',
            }}>{SOURCE_LABELS[t.source]}</span>
            {t.source === 'race' && <span style={{
              fontSize: 10, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
              letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text4)',
              background: 'var(--bg3)', borderRadius: 3, padding: '1px 6px',
            }}>{t.title}</span>}
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

      {/* Expanded: lines + action bar */}
      {expanded && (
        <div style={{ borderTop: '1px solid var(--line)' }}>
          <div style={{ padding: '12px 16px 4px 64px' }}>
            {t.lines.map((line, i) => (
              i < 2 && !editing ? null :
              <EditableLine
                key={i}
                speaker={line.speaker}
                text={line.text}
                editing={editing}
                onUpdate={(sp, tx) => onUpdateLine(i, sp, tx)}
              />
            ))}
          </div>

          {/* Action bar */}
          <div style={{ padding: '8px 16px 12px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 6 }}>
            {confirmDelete ? (
              <>
                <span style={{ fontSize: 12, color: 'var(--text3)', marginRight: 4 }}>Delete this transcript?</span>
                <button onClick={e => { e.stopPropagation(); setConfirmDelete(false); }} style={btnStyle}>Cancel</button>
                <button onClick={e => { e.stopPropagation(); onDelete(); }} style={{ ...btnStyle, color: 'var(--red)', borderColor: 'var(--rb)', background: 'var(--rg)', fontWeight: 600 }}>Delete</button>
              </>
            ) : (
              <>
                {/* Edit toggle */}
                <button
                  onClick={e => { e.stopPropagation(); setEditing(v => !v); }}
                  title={editing ? 'Done editing' : 'Edit transcript'}
                  style={{ ...iconBtnStyle, color: editing ? 'var(--green)' : 'var(--text3)', borderColor: editing ? 'var(--gb)' : 'var(--line)', background: editing ? 'var(--gg)' : 'none' }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                  {editing ? 'Done' : 'Edit'}
                </button>

                {/* Delete */}
                <button
                  onClick={e => { e.stopPropagation(); setConfirmDelete(true); }}
                  title="Delete transcript"
                  style={{ ...iconBtnStyle, color: 'var(--text4)' }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                  </svg>
                  Delete
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SelectWrap({ children, active }: { children: React.ReactNode; active: boolean }) {
  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <div style={{ pointerEvents: 'none', position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text4)' }}>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      {React.cloneElement(children as React.ReactElement, {
        style: {
          height: 32, padding: '0 30px 0 12px', borderRadius: 8,
          border: `1px solid ${active ? 'var(--text3)' : 'var(--line)'}`,
          cursor: 'pointer', fontSize: 13, fontFamily: 'inherit',
          background: active ? 'var(--bg3)' : 'var(--bg2)',
          color: 'var(--text2)', outline: 'none',
          appearance: 'none' as const, WebkitAppearance: 'none' as const,
        },
      })}
    </div>
  );
}

const SOURCES: { id: TranscriptSource | 'all'; label: string }[] = [
  { id: 'all',     label: 'All' },
  { id: 'race',    label: 'Race' },
  { id: 'capture', label: 'Capture' },
  { id: 'debrief', label: 'Debrief' },
  { id: 'upload',  label: 'Upload' },
];

export default function Transcripts() {
  const [source, setSource]   = useState<TranscriptSource | 'all'>('all');
  const [regatta, setRegatta] = useState('All');
  const [team, setTeam]       = useState('All');
  const [search, setSearch]   = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [transcripts, setTranscripts] = useState<Transcript[]>(() => [...getCaptured(), ...getTranscripts()]);

  useEffect(() => {
    return subscribeCapture(() => {
      setTranscripts([...getCaptured(), ...getTranscripts()]);
    });
  }, []);

  const all = transcripts;

  function handleDelete(id: string) {
    setTranscripts(prev => prev.filter(t => t.id !== id));
    setExpandedId(null);
  }

  function handleUpdateLine(id: string, lineIdx: number, speaker: string, text: string) {
    setTranscripts(prev => prev.map(t =>
      t.id !== id ? t : {
        ...t,
        lines: t.lines.map((l, i) => i === lineIdx ? { speaker, text } : l),
      }
    ));
  }

  const q = search.trim().toLowerCase();
  const filtered = all.filter(t => {
    if (source !== 'all' && t.source !== source) return false;
    if (regatta !== 'All' && t.regatta !== regatta) return false;
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
  const showRegattaFilter = source === 'all' || source === 'race';
  const showTeamFilter    = source === 'all' || source === 'race';

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // TODO: send to /api/transcribe
    alert(`Upload received: ${file.name} — transcription coming soon.`);
    e.target.value = '';
  }

  return (
    <div className="s-backbone">
      <div className="main" style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px 24px 0', flexShrink: 0 }}>

          {/* Header */}
          <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>
            Season 6 · 2026
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', flex: 1 }}>
              Transcripts
            </div>
            {/* Search */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: '#fff', border: '1.5px solid var(--line)', borderRadius: 8,
              padding: '0 12px', height: 36, minWidth: 200,
              boxShadow: '0 1px 3px rgba(10,22,40,0.05)',
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text4)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search…"
                style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 13, color: 'var(--text)', fontFamily: 'inherit' }}
              />
              {search && (
                <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text4)', padding: 0, lineHeight: 1 }}>✕</button>
              )}
            </div>
            {/* Upload */}
            <input ref={fileInputRef} type="file" accept="audio/*,video/*" style={{ display: 'none' }} onChange={handleUpload} />
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '0 16px', height: 36, borderRadius: 8,
                background: 'var(--bg2)', border: '1.5px solid var(--line)',
                color: 'var(--text2)', fontSize: 13, fontWeight: 500,
                cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
                transition: 'border-color 0.12s, color 0.12s',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              Upload audio
            </button>
          </div>

          {/* Filter bar: source tabs + contextual dropdowns in one row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            {SOURCES.map(s => (
              <button
                key={s.id}
                onClick={() => { setSource(s.id); setRegatta('All'); setTeam('All'); }}
                style={{
                  flexShrink: 0, padding: '5px 14px', borderRadius: 20,
                  border: '1px solid', cursor: 'pointer', fontSize: 13, fontWeight: 500,
                  fontFamily: 'inherit', transition: 'all 0.12s',
                  background: source === s.id ? 'var(--navy)' : 'var(--bg2)',
                  borderColor: source === s.id ? 'var(--navy)' : 'var(--line)',
                  color: source === s.id ? '#fff' : 'var(--text2)',
                }}
              >
                {s.label}
              </button>
            ))}

            {showRegattaFilter && (
              <>
                <div style={{ width: 1, height: 20, background: 'var(--line)', margin: '0 2px' }} />
                <SelectWrap active={regatta !== 'All'}>
                  <select value={regatta} onChange={e => setRegatta(e.target.value)}>
                    {ALL_REGATTAS.map(r => <option key={r} value={r}>{r === 'All' ? 'All events' : r}</option>)}
                  </select>
                </SelectWrap>

                <SelectWrap active={team !== 'All'}>
                  <select value={team} onChange={e => setTeam(e.target.value)}>
                    {allTeams.map(t => (
                      <option key={t} value={t}>
                        {t === 'All' ? 'All teams' : `${TEAM_FLAGS[t] ?? ''} ${t}`}
                      </option>
                    ))}
                  </select>
                </SelectWrap>
              </>
            )}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 24px 24px' }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text4)', fontSize: 14 }}>
              {source === 'capture' || source === 'debrief' || source === 'upload'
                ? 'No transcripts yet'
                : 'No transcripts for this selection'}
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
                  onDelete={() => handleDelete(t.id)}
                  onUpdateLine={(lineIdx, speaker, text) => handleUpdateLine(t.id, lineIdx, speaker, text)}
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
