'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { type Transcript, type TranscriptSource } from '@/data/transcripts';
import { useRole } from '@/context/RoleContext';
import { fetchAllTranscripts, deleteTranscript, updateTranscript } from '@/lib/transcriptApi';
const TEAM_FLAGS: Record<string, string> = {
  AUS: '🇦🇺', BRA: '🇧🇷', CAN: '🇨🇦', DEN: '🇩🇰', ESP: '🇪🇸',
  FRA: '🇫🇷', GBR: '🇬🇧', GER: '🇩🇪', ITA: '🇮🇹', JPN: '🇯🇵',
  NZL: '🇳🇿', SUI: '🇨🇭', UAE: '🇦🇪', USA: '🇺🇸', SWE: '🇸🇪', 
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

function TranscriptCard({ t, expanded, onToggle, onDelete, onUpdateLine, onEditDone, searchQuery }: {
  t: Transcript;
  expanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onUpdateLine: (lineIdx: number, speaker: string, text: string) => void;
  onEditDone: () => void;
  searchQuery: string;
}) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const preview = t.lines.slice(0, 2);
  const rest = t.lines.slice(2);

  return (
    <div
      style={{
        background: 'var(--bg2)',
        border: '1px solid var(--line)',
        borderRadius: 10,
        overflow: 'hidden',
        transition: 'box-shadow 0.15s',
        boxShadow: expanded ? '0 2px 12px rgba(10,22,40,0.06)' : 'none',
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
                  onClick={e => {
                    e.stopPropagation();
                    if (editing) onEditDone();
                    setEditing(v => !v);
                  }}
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

interface DropdownOption { value: string; label: string; icon?: React.ReactNode }

function Dropdown({ value, options, onChange, placeholder }: {
  value: string;
  options: DropdownOption[];
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = value !== options[0]?.value;
  const current = options.find(o => o.value === value);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false); }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          height: 32, padding: '0 10px 0 12px', borderRadius: 8,
          border: `1px solid ${active ? 'var(--text3)' : 'var(--line)'}`,
          background: active ? 'var(--bg3)' : 'var(--bg2)',
          color: active ? 'var(--text)' : 'var(--text2)',
          fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
          whiteSpace: 'nowrap', fontWeight: active ? 500 : 400,
          transition: 'border-color 0.12s, background 0.12s',
        }}
      >
        {current?.icon && <span style={{ lineHeight: 1 }}>{current.icon}</span>}
        <span>{current?.label ?? placeholder}</span>
        <svg
          width="10" height="10" viewBox="0 0 10 10" fill="none"
          style={{ transition: 'transform 0.15s', transform: open ? 'rotate(180deg)' : 'none', color: 'var(--text4)', flexShrink: 0 }}
        >
          <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 5px)', left: 0, zIndex: 100,
          background: 'var(--bg2)', border: '1px solid var(--line)',
          borderRadius: 10, padding: '4px',
          boxShadow: '0 8px 24px rgba(10,14,20,0.18)',
          minWidth: '100%',
          animation: 'ddFadeIn 0.12s ease-out',
        }}>
          {options.map(opt => {
            const sel = opt.value === value;
            return (
              <button
                key={opt.value}
                onClick={() => { onChange(opt.value); setOpen(false); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  width: '100%', padding: '7px 10px', borderRadius: 7,
                  border: 'none', background: sel ? 'var(--bg3)' : 'transparent',
                  color: sel ? 'var(--text)' : 'var(--text2)',
                  fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
                  textAlign: 'left', fontWeight: sel ? 600 : 400,
                  transition: 'background 0.08s',
                }}
                onMouseEnter={e => { if (!sel) (e.currentTarget as HTMLElement).style.background = 'var(--bg3)'; }}
                onMouseLeave={e => { if (!sel) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                {opt.icon && <span style={{ lineHeight: 1, flexShrink: 0 }}>{opt.icon}</span>}
                <span style={{ flex: 1 }}>{opt.label}</span>
                {sel && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
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

const UPLOAD_REGATTAS = ['New York', 'Halifax', 'Portsmouth', 'Sassnitz', 'Valencia', 'Geneva', 'Dubai', 'Abu Dhabi'];
const UPLOAD_TEAMS = Object.keys(TEAM_FLAGS).sort();
const UPLOAD_TAGS = ['Debrief', 'Race', 'Training', 'Practice', 'Hot Wash', 'Briefing', 'Team', 'Coaching'];

interface UploadForm {
  file: File | null;
  title: string;
  user: string;
}

function UploadModal({ onClose, onSubmit }: {
  onClose: () => void;
  onSubmit: (form: UploadForm) => void;
}) {
  const { role } = useRole();
  const [form, setForm] = useState<UploadForm>({
  	file: null, title: '', user: role!.name,
  });
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function setFile(f: File | null) {
    if (!f) return;
    setForm(p => ({ ...p, file: f, title: p.title || f.name.replace(/\.[^.]+$/, '') }));
  }

	
  
  const canSubmit = !!form.file && !!form.title.trim();

  const fieldStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', height: 36,
    background: 'var(--bg)', border: '1px solid var(--line)',
    borderRadius: 7, padding: '0 11px', fontSize: 13,
    color: 'var(--text)', fontFamily: 'inherit', outline: 'none',
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, color: 'var(--text3)',
    fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.1em',
    textTransform: 'uppercase', marginBottom: 5, display: 'block',
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(10,14,20,0.55)', backdropFilter: 'blur(3px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: 'var(--bg2)', border: '1px solid var(--line)',
        borderRadius: 14, width: '100%', maxWidth: 480,
        maxHeight: '90dvh', overflowY: 'auto',
        boxShadow: '0 24px 64px rgba(10,14,20,0.4)',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 22px 16px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 18, fontWeight: 800, letterSpacing: '0.01em', color: 'var(--text)', lineHeight: 1 }}>Upload Audio</div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 3 }}>Add context before transcribing</div>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--line)', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); setFile(e.dataTransfer.files[0]); }}
            onClick={() => fileRef.current?.click()}
            style={{
              border: `2px dashed ${dragging ? 'var(--green)' : form.file ? 'var(--gb)' : 'var(--line)'}`,
              borderRadius: 10, padding: '20px 16px',
              textAlign: 'center', cursor: 'pointer',
              background: dragging ? 'var(--gg)' : form.file ? 'var(--bg3)' : 'var(--bg)',
              transition: 'all 0.15s',
            }}
          >
            <input ref={fileRef} type="file" accept="audio/*,video/*" style={{ display: 'none' }} onChange={e => setFile(e.target.files?.[0] ?? null)} />
            {form.file ? (
              <>
                <div style={{ fontSize: 22, marginBottom: 5 }}>🎵</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', wordBreak: 'break-all' }}>{form.file.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text4)', marginTop: 2 }}>{(form.file.size / 1024 / 1024).toFixed(1)} MB · click to change</div>
              </>
            ) : (
              <>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 8 }}>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                <div style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 500 }}>Drop audio file here</div>
                <div style={{ fontSize: 11, color: 'var(--text4)', marginTop: 3 }}>or click to browse · mp3, m4a, wav, mp4</div>
              </>
            )}
          </div>

          {/* Title */}
          <div>
            <label style={labelStyle}>Title *</label>
            <input
              style={fieldStyle}
              placeholder="e.g. R4 debrief — port tack calls"
              value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
            />
          </div>
   
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 22px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={{ ...btnStyle, padding: '6px 16px' }}>Cancel</button>
          <button
            disabled={!canSubmit}
            onClick={() => canSubmit && onSubmit(form)}
            style={{
              padding: '6px 18px', borderRadius: 7, border: 'none',
              background: canSubmit ? 'var(--navy)' : 'var(--bg3)',
              color: canSubmit ? '#fff' : 'var(--text4)',
              fontSize: 13, fontWeight: 600, cursor: canSubmit ? 'pointer' : 'default',
              fontFamily: 'inherit', transition: 'background 0.15s',
            }}
          >
            Upload &amp; Transcribe
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Transcripts() {
  const [source, setSource]   = useState<TranscriptSource | 'all'>('all');
  const [regatta, setRegatta] = useState('All');
  const [team, setTeam]       = useState('All');
  const [search, setSearch]   = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showUpload, setShowUpload]   = useState(false);
  const [dbTranscripts, setDbTranscripts] = useState<Transcript[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    fetchAllTranscripts()
      .then(data => { setDbTranscripts(data); setLoading(false); })
      .catch(err => { setError(err.message ?? 'Failed to load'); setLoading(false); });
  }, []);


  const transcripts = [...dbTranscripts];

  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [edits, setEdits] = useState<Map<string, Transcript>>(new Map());
  const [uploaded, setUploaded] = useState<Transcript[]>([]);

  const all = [...uploaded, ...transcripts].filter(t => !deletedIds.has(t.id))
    .map(t => edits.get(t.id) ?? t);

  function handleDelete(id: string) {
    setDeletedIds(prev => new Set([...prev, id]));
    setExpandedId(null);
    deleteTranscript(id).catch(err => console.error('Delete failed:', err));
  }

  function handleUpdateLine(id: string, lineIdx: number, speaker: string, text: string) {
    const base = all.find(t => t.id === id);
    if (!base) return;
    const updated = {
      ...base,
      lines: base.lines.map((l, i) => i === lineIdx ? { speaker, text } : l),
    };
    setEdits(prev => new Map([...prev, [id, updated]]));
  }

  function handleEditDone(id: string) {
    const updated = edits.get(id);
    if (updated) updateTranscript(updated).catch(err => console.error('Update failed:', err));
  }

  function handleUploadSubmit(form: UploadForm){
	  fetch('/api/transcripts?type=media',
			{method: 'POST', body: JSON.stringify({title: form.title, user: form.user, data: form.file})});
  }


  const dynamicRegattas = ['All', ...Array.from(new Set(
    all.map(t => t.regatta).filter(Boolean)
  )).sort()];

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

  const allTeams = ['All', ...Array.from(new Set(
    ['All', ...Object.keys(TEAM_FLAGS), ...all.map(t => t.team).filter(Boolean)]
  )).filter(t => t !== 'All').sort()];
  const showRegattaFilter = source === 'all' || source === 'race';
  const showTeamFilter    = source === 'all' || source === 'race';

  return (
    <>
    {showUpload && <UploadModal onClose={() => setShowUpload(false)} onSubmit={handleUploadSubmit} />}
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
              background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 8,
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
            <button
              onClick={() => setShowUpload(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '0 16px', height: 36, borderRadius: 8,
                background: 'var(--bg2)', border: '1px solid var(--line)',
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
                  flexShrink: 0, height: 32, padding: '0 14px', borderRadius: 20,
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
                <Dropdown
                  value={regatta}
                  onChange={setRegatta}
                  options={dynamicRegattas.map(r => ({ value: r, label: r === 'All' ? 'All events' : r }))}
                />

                <Dropdown
                  value={team}
                  onChange={setTeam}
                  options={allTeams.map(t => ({
                    value: t,
                    label: t === 'All' ? 'All teams' : t,
                    icon: t !== 'All' ? TEAM_FLAGS[t] : undefined,
                  }))}
                />
              </>
            )}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 24px 24px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text4)', fontSize: 14 }}>
              Loading transcripts…
            </div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--red)', fontSize: 14 }}>
              Could not load transcripts: {error}
            </div>
          ) : filtered.length === 0 ? (
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
                  onEditDone={() => handleEditDone(t.id)}
                  searchQuery={q}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
}
