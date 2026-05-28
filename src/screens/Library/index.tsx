'use client';

import React, { useState, useRef } from 'react';

const REGATTAS = ['All', 'Perth', 'Auckland', 'Sydney', 'Rio', 'Bermuda', 'New York', 'Halifax', 'Portsmouth', 'Sassnitz', 'Valencia', 'Geneva', 'Dubai', 'Abu Dhabi'];

const FILE_TYPES = ['Debrief', 'Race', 'Training', 'Strategy', 'Video', 'Data', 'Other'];

function fileExt(name: string) {
  return name.split('.').pop()?.toLowerCase() ?? '';
}

function FileTypeIcon({ ext }: { ext: string }) {
  const isVideo = ['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext);
  const isPdf   = ext === 'pdf';
  const isDoc   = ['doc', 'docx', 'pages', 'txt', 'md'].includes(ext);
  const isData  = ['csv', 'xlsx', 'xls', 'json'].includes(ext);

  if (isVideo) return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>
    </svg>
  );
  if (isDoc) return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/><line x1="8" y1="9" x2="10" y2="9"/>
    </svg>
  );
  if (isPdf) return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="13" y2="17"/>
    </svg>
  );
  if (isData) return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/>
      <line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/>
    </svg>
  );
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
    </svg>
  );
}

function iconColor(ext: string) {
  if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext)) return 'var(--navy)';
  if (ext === 'pdf') return 'var(--red)';
  if (['doc', 'docx', 'pages', 'txt', 'md'].includes(ext)) return '#2B579A';
  if (['csv', 'xlsx', 'xls', 'json'].includes(ext)) return 'var(--green)';
  return 'var(--text3)';
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

interface LibraryFile {
  id: string;
  name: string;
  regatta: string;
  uploadType: string;
  ext: string;
  size: number;
  uploadedAt: string;
  local?: boolean;
}

interface UploadForm {
  files: File[];
  regatta: string;
  uploadType: string;
}

function UploadModal({ onClose, onSubmit, uploading }: {
  onClose: () => void;
  onSubmit: (form: UploadForm) => void;
  uploading: boolean;
}) {
  const [form, setForm] = useState<UploadForm>({ files: [], regatta: '', uploadType: 'Debrief' });
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function addFiles(incoming: FileList | null) {
    if (!incoming) return;
    const arr = Array.from(incoming);
    setForm(p => ({ ...p, files: [...p.files, ...arr.filter(f => !p.files.some(e => e.name === f.name && e.size === f.size))] }));
  }

  function removeFile(idx: number) {
    setForm(p => ({ ...p, files: p.files.filter((_, i) => i !== idx) }));
  }

  const canSubmit = form.files.length > 0 && !!form.regatta && !uploading;

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
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(10,14,20,0.55)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--line)', borderRadius: 14, width: '100%', maxWidth: 460, maxHeight: '90dvh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(10,14,20,0.4)' }}>

        {/* Header */}
        <div style={{ padding: '20px 22px 16px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 18, fontWeight: 800, letterSpacing: '0.01em', color: 'var(--text)', lineHeight: 1 }}>Upload File</div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 3 }}>PDF, video, data — any coaching file</div>
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
            onDrop={e => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
            onClick={() => fileRef.current?.click()}
            style={{
              border: `2px dashed ${dragging ? 'var(--green)' : form.files.length ? 'var(--gb)' : 'var(--line)'}`,
              borderRadius: 10, padding: '22px 16px', textAlign: 'center', cursor: 'pointer',
              background: dragging ? 'var(--gg)' : 'var(--bg)',
              transition: 'all 0.15s',
            }}
          >
            <input ref={fileRef} type="file" multiple style={{ display: 'none' }} onChange={e => addFiles(e.target.files)} />
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--text4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 7 }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            <div style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 500 }}>Drop files here</div>
                <div style={{ fontSize: 11, color: 'var(--text4)', marginTop: 3 }}>or click to browse · pdf, docx, mp4, mov, csv, xlsx… · multiple OK</div>
          </div>

          {/* File list */}
          {form.files.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                {form.files.length} file{form.files.length !== 1 ? 's' : ''} selected
              </div>
              {form.files.map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, background: 'var(--bg3)', border: '1px solid var(--line)' }}>
                  <span style={{ color: iconColor(fileExt(f.name)), flexShrink: 0 }}>
                    <FileTypeIcon ext={fileExt(f.name)} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text4)' }}>{formatBytes(f.size)}</div>
                  </div>
                  <button onClick={e => { e.stopPropagation(); removeFile(i); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text4)', padding: 2, flexShrink: 0, display: 'flex', lineHeight: 1 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Regatta */}
          <div>
            <label style={labelStyle}>Regatta *</label>
            <select style={{ ...fieldStyle, appearance: 'none' }} value={form.regatta} onChange={e => setForm(p => ({ ...p, regatta: e.target.value }))}>
              <option value="">— select regatta —</option>
              {REGATTAS.filter(r => r !== 'All').map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          {/* Type */}
          <div>
            <label style={labelStyle}>Type</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {FILE_TYPES.map(t => {
                const on = form.uploadType === t;
                return (
                  <button
                    key={t}
                    onClick={() => setForm(p => ({ ...p, uploadType: t }))}
                    style={{
                      height: 28, padding: '0 10px', borderRadius: 5,
                      border: `1px solid ${on ? 'var(--navy)' : 'var(--line)'}`,
                      background: on ? 'var(--navy)' : 'var(--bg)',
                      color: on ? '#fff' : 'var(--text2)',
                      fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >{t}</button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 22px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={{ padding: '6px 16px', borderRadius: 6, border: '1px solid var(--line)', background: 'none', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', color: 'var(--text3)' }}>Cancel</button>
          <button
            disabled={!canSubmit}
            onClick={() => canSubmit && onSubmit(form)}
            style={{
              padding: '6px 18px', borderRadius: 7, border: 'none',
              background: canSubmit ? 'var(--navy)' : 'var(--bg3)',
              color: canSubmit ? '#fff' : 'var(--text4)',
              fontSize: 13, fontWeight: 600, cursor: canSubmit ? 'pointer' : 'default',
              fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 7,
            }}
          >
            {uploading && <span style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />}
            {uploading ? 'Uploading…' : 'Upload'}
          </button>
        </div>
      </div>
    </div>
  );
}

function FileCard({ file }: { file: LibraryFile }) {
  const color = iconColor(file.ext);
  return (
    <div style={{
      background: 'var(--bg2)', border: '1px solid var(--line)', borderRadius: 10,
      padding: '14px 16px', display: 'flex', gap: 14, alignItems: 'flex-start',
      transition: 'box-shadow 0.15s',
    }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 2px 12px rgba(10,22,40,0.07)')}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
    >
      <div style={{
        flexShrink: 0, width: 40, height: 40, borderRadius: 8,
        background: 'var(--bg3)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', color,
      }}>
        <FileTypeIcon ext={file.ext} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)', marginBottom: 4, wordBreak: 'break-word' }}>{file.name}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
          {file.regatta && (
            <span style={{ fontSize: 10, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text3)', background: 'var(--bg3)', borderRadius: 3, padding: '1px 6px' }}>
              {file.regatta}
            </span>
          )}
          <span style={{ fontSize: 10, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--navy)', background: 'var(--bg3)', borderRadius: 3, padding: '1px 6px' }}>
            {file.uploadType}
          </span>
          {file.local && (
            <span style={{ fontSize: 10, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--yellow)', background: 'var(--yg)', borderRadius: 3, padding: '1px 6px', border: '1px solid var(--yb)' }}>
              This session
            </span>
          )}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text4)', marginTop: 5 }}>
          {formatBytes(file.size)} · {file.uploadedAt}
        </div>
      </div>
    </div>
  );
}

export default function Library() {
  const [regatta, setRegatta] = useState('All');
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState<LibraryFile[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function handleUpload(form: UploadForm) {
    if (!form.files.length) return;
    setUploading(true);
    setUploadError(null);
    try {
      const ts = new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

      await Promise.all(form.files.map(async file => {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('filetype', fileExt(file.name) || 'unknown');
        fd.append('upload_type', `${form.regatta} · ${form.uploadType}`);

        const res = await fetch('/api/library', { method: 'POST', body: fd });
        if (!res.ok) throw new Error(`Upload failed for ${file.name} (${res.status})`);

        const newFile: LibraryFile = {
          id: `local-${Date.now()}-${file.name}`,
          name: file.name,
          regatta: form.regatta,
          uploadType: form.uploadType,
          ext: fileExt(file.name),
          size: file.size,
          uploadedAt: ts,
          local: true,
        };
        setFiles(prev => [newFile, ...prev]);
      }));

      setShowUpload(false);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  const filtered = regatta === 'All' ? files : files.filter(f => f.regatta === regatta);

  const activeRegattas = ['All', ...Array.from(new Set(files.map(f => f.regatta).filter(Boolean)))];

  return (
    <>
      {showUpload && <UploadModal onClose={() => setShowUpload(false)} onSubmit={handleUpload} uploading={uploading} />}
      <div className="s-backbone">
        <div className="main" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '20px 24px 0', flexShrink: 0 }}>

            {/* Header */}
            <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>
              Season 6 · 2026
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', flex: 1 }}>Library</div>
              <button
                onClick={() => setShowUpload(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  padding: '0 16px', height: 36, borderRadius: 8,
                  background: 'var(--navy)', border: 'none',
                  color: '#fff', fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                Upload file
              </button>
            </div>

            {/* Regatta filter */}
            {activeRegattas.length > 1 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                {activeRegattas.map(r => (
                  <button
                    key={r}
                    onClick={() => setRegatta(r)}
                    style={{
                      flexShrink: 0, height: 32, padding: '0 14px', borderRadius: 20,
                      border: '1px solid', cursor: 'pointer', fontSize: 13, fontWeight: 500,
                      fontFamily: 'inherit', transition: 'all 0.12s',
                      background: regatta === r ? 'var(--navy)' : 'var(--bg2)',
                      borderColor: regatta === r ? 'var(--navy)' : 'var(--line)',
                      color: regatta === r ? '#fff' : 'var(--text2)',
                    }}
                  >{r === 'All' ? 'All events' : r}</button>
                ))}
              </div>
            )}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 24px 24px' }}>
            {uploadError && (
              <div style={{ marginBottom: 12, padding: '10px 14px', borderRadius: 8, background: 'var(--rg)', border: '1px solid var(--rb)', fontSize: 13, color: 'var(--red)' }}>
                {uploadError}
              </div>
            )}

            {filtered.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: 12 }}>
                <div style={{ color: 'var(--text4)' }}>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                  </svg>
                </div>
                <div style={{ fontSize: 14, color: 'var(--text4)', textAlign: 'center' }}>
                  No files yet — upload your first coaching file
                </div>
                <button
                  onClick={() => setShowUpload(true)}
                  style={{
                    marginTop: 4, padding: '8px 20px', borderRadius: 8,
                    background: 'var(--navy)', border: 'none', color: '#fff',
                    fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  Upload file
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontSize: 12, color: 'var(--text4)', marginBottom: 2 }}>
                  {filtered.length} file{filtered.length !== 1 ? 's' : ''}
                </div>
                {filtered.map(f => <FileCard key={f.id} file={f} />)}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
