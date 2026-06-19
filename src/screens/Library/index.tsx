'use client';

import React, { useState, useEffect } from 'react';
interface DriveFile { id: string; name: string; mimeType: string; size?: string | null; modifiedTime?: string | null; webViewLink?: string | null; regatta: string; category: string; }

// ── Drive embed URL (same logic as race dashboard) ────────────────────────────
function driveEmbedUrl(url: string): string {
  if (/docs\.google\.com\/(document|spreadsheets|presentation|forms)/.test(url)) {
    return url.replace(/\/(edit|view|htmlview)(\?.*)?$/, '/preview');
  }
  const fileId = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)?.[1]
    ?? url.match(/[?&]id=([a-zA-Z0-9_-]+)/)?.[1];
  if (fileId) return `https://drive.google.com/file/d/${fileId}/preview`;
  return url;
}

// ── File type helpers ─────────────────────────────────────────────────────────
function mimeLabel(m: string): string {
  if (m === 'application/vnd.google-apps.document') return 'Doc';
  if (m === 'application/vnd.google-apps.spreadsheet') return 'Sheet';
  if (m === 'application/vnd.google-apps.presentation') return 'Slides';
  if (m === 'application/pdf') return 'PDF';
  if (m.startsWith('video/')) return 'Video';
  if (m.startsWith('audio/')) return 'Audio';
  if (m.startsWith('image/')) return 'Image';
  if (m === 'text/plain') return 'Text';
  return 'File';
}

function mimeColor(m: string): string {
  if (m === 'application/vnd.google-apps.document') return '#4285F4';
  if (m === 'application/vnd.google-apps.spreadsheet') return '#34A853';
  if (m === 'application/vnd.google-apps.presentation') return '#FBBC04';
  if (m === 'application/pdf') return '#e53e3e';
  if (m.startsWith('video/')) return 'var(--navy)';
  if (m.startsWith('audio/')) return '#9f7aea';
  return 'var(--text4)';
}

function FileIcon({ mimeType, size = 14 }: { mimeType: string; size?: number }) {
  const color = mimeColor(mimeType);
  if (mimeType.startsWith('video/')) return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>
    </svg>
  );
  if (mimeType.startsWith('audio/')) return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
    </svg>
  );
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
    </svg>
  );
}

function stripPrefix(name: string): string {
  return name.replace(/^\d{2}-/, '');
}

function formatDate(iso?: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Library() {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRegatta, setSelectedRegatta] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<DriveFile | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/drive')
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setFiles(data);
        // Auto-select most recent regatta
        const regattas = Array.from(new Set((data as DriveFile[]).map(f => f.regatta))).sort().reverse();
        if (regattas.length > 0) setSelectedRegatta(regattas[0] as string);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const regattas = Array.from(new Set(files.map(f => f.regatta)))
    .sort((a, b) => b.localeCompare(a)); // newest (highest number) first

  const visibleFiles = files.filter(f => {
    const matchRegatta = !selectedRegatta || f.regatta === selectedRegatta;
    const matchSearch = !search || f.name.toLowerCase().includes(search.toLowerCase()) || f.category.toLowerCase().includes(search.toLowerCase());
    return matchRegatta && matchSearch;
  });

  // Group by category
  const byCategory = visibleFiles.reduce<Record<string, DriveFile[]>>((acc, f) => {
    const key = f.category || 'Other';
    (acc[key] ??= []).push(f);
    return acc;
  }, {});
  const sortedCategories = Object.keys(byCategory).sort();

  const canEmbed = (f: DriveFile) =>
    f.webViewLink &&
    (f.mimeType.includes('google-apps') || f.mimeType === 'application/pdf');

  return (
    <div className="s-backbone" style={{ overflow: 'hidden' }}>
      {/* ── Sidebar: regatta list ─────────────────────── */}
      <div style={{ width: 200, flexShrink: 0, borderRight: '1px solid var(--line)', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        <div style={{ padding: '18px 16px 10px', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
          <div style={{ fontSize: 9, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--text4)', marginBottom: 6 }}>Season 6 · 2026</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>Library</div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {loading && <div style={{ padding: '20px 16px', fontSize: 12, color: 'var(--text4)' }}>Loading…</div>}
          {regattas.map(r => (
            <button
              key={r}
              onClick={() => { setSelectedRegatta(r); setSelectedFile(null); setSearch(''); }}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '8px 16px', border: 'none', cursor: 'pointer',
                fontFamily: 'inherit', fontSize: 13, fontWeight: selectedRegatta === r ? 600 : 400,
                background: selectedRegatta === r ? 'var(--gg)' : 'none',
                color: selectedRegatta === r ? 'var(--green)' : 'var(--text2)',
                borderLeft: `2px solid ${selectedRegatta === r ? 'var(--green)' : 'transparent'}`,
              }}
            >
              {stripPrefix(r)}
            </button>
          ))}
        </div>
        <div style={{ padding: '10px 12px', borderTop: '1px solid var(--line)', flexShrink: 0 }}>
          <a href={`https://drive.google.com/drive/folders/${process.env.NEXT_PUBLIC_GOOGLE_DRIVE_FOLDER_ID ?? '1MfoIcFbP0zlAxMNwgMQN4cu-YHCpdquF'}`} target="_blank" rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text4)', textDecoration: 'none' }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            Open in Drive
          </a>
        </div>
      </div>

      {/* ── File list ─────────────────────────────────── */}
      <div style={{ width: selectedFile ? 280 : undefined, flex: selectedFile ? undefined : 1, flexShrink: 0, display: 'flex', flexDirection: 'column', borderRight: selectedFile ? '1px solid var(--line)' : 'none', overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px 10px', flexShrink: 0, borderBottom: '1px solid var(--line)' }}>
          <div style={{ position: 'relative' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
              style={{ width: '100%', boxSizing: 'border-box', height: 30, paddingLeft: 28, paddingRight: 10, border: '1px solid var(--line)', borderRadius: 6, background: 'var(--bg2)', fontSize: 12, color: 'var(--text)', fontFamily: 'inherit', outline: 'none' }} />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {error && <div style={{ padding: 16, fontSize: 13, color: 'var(--red)' }}>{error}</div>}
          {!loading && !error && visibleFiles.length === 0 && (
            <div style={{ padding: '40px 16px', textAlign: 'center', fontSize: 13, color: 'var(--text4)' }}>No files</div>
          )}
          {sortedCategories.map(cat => (
            <div key={cat}>
              {cat !== 'Other' && (
                <div style={{ padding: '8px 16px 4px', fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text4)', fontFamily: "'Barlow Condensed', sans-serif" }}>
                  {stripPrefix(cat)}
                </div>
              )}
              {byCategory[cat].map(f => (
                <button
                  key={f.id}
                  onClick={() => setSelectedFile(prev => prev?.id === f.id ? null : f)}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10, width: '100%',
                    padding: '8px 16px', border: 'none', cursor: 'pointer', textAlign: 'left',
                    background: selectedFile?.id === f.id ? 'var(--gg)' : 'none',
                    borderLeft: `2px solid ${selectedFile?.id === f.id ? 'var(--green)' : 'transparent'}`,
                    fontFamily: 'inherit',
                  }}
                  onMouseEnter={e => { if (selectedFile?.id !== f.id) (e.currentTarget as HTMLElement).style.background = 'var(--bg2)'; }}
                  onMouseLeave={e => { if (selectedFile?.id !== f.id) (e.currentTarget as HTMLElement).style.background = 'none'; }}
                >
                  <span style={{ flexShrink: 0, marginTop: 1 }}><FileIcon mimeType={f.mimeType} /></span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.3 }}>{f.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--text4)', marginTop: 1 }}>{formatDate(f.modifiedTime)}</div>
                  </div>
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ── Inline viewer ─────────────────────────────── */}
      {selectedFile && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          {/* File header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: '1px solid var(--line)', flexShrink: 0, background: 'var(--bg2)' }}>
            <FileIcon mimeType={selectedFile.mimeType} size={13} />
            <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedFile.name}</span>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: mimeColor(selectedFile.mimeType), background: 'var(--bg3)', borderRadius: 3, padding: '1px 5px', flexShrink: 0 }}>
              {mimeLabel(selectedFile.mimeType)}
            </span>
            {selectedFile.webViewLink && (
              <a href={selectedFile.webViewLink} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 11, color: 'var(--text4)', textDecoration: 'none', flexShrink: 0 }}>
                ↗ Drive
              </a>
            )}
          </div>
          {/* Content */}
          {canEmbed(selectedFile) && selectedFile.webViewLink ? (
            <iframe
              key={selectedFile.id}
              src={driveEmbedUrl(selectedFile.webViewLink)}
              style={{ flex: 1, border: 'none', display: 'block', width: '100%' }}
              allow="autoplay"
              title={selectedFile.name}
            />
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: 'var(--text4)' }}>
              <FileIcon mimeType={selectedFile.mimeType} size={36} />
              <div style={{ fontSize: 14, color: 'var(--text2)', fontWeight: 500 }}>{selectedFile.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text4)' }}>Preview not available for this file type</div>
              {selectedFile.webViewLink && (
                <a href={selectedFile.webViewLink} target="_blank" rel="noopener noreferrer"
                  style={{ marginTop: 4, padding: '7px 18px', borderRadius: 7, background: 'var(--navy)', color: '#fff', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                  Open in Drive
                </a>
              )}
            </div>
          )}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
