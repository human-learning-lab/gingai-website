'use client';

import React, { useState, useEffect } from 'react';

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  webViewLink?: string;
}

function mimeToExt(mimeType: string): string {
  if (mimeType === 'application/vnd.google-apps.document') return 'gdoc';
  if (mimeType === 'application/vnd.google-apps.spreadsheet') return 'gsheet';
  if (mimeType === 'application/vnd.google-apps.presentation') return 'gslides';
  if (mimeType === 'application/vnd.google-apps.folder') return 'folder';
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'xlsx';
  if (mimeType.includes('document') || mimeType.includes('word')) return 'docx';
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'pptx';
  const sub = mimeType.split('/')[1] ?? '';
  return sub.split('.').pop() ?? 'file';
}

function mimeLabel(mimeType: string): string {
  if (mimeType === 'application/vnd.google-apps.document') return 'Doc';
  if (mimeType === 'application/vnd.google-apps.spreadsheet') return 'Sheet';
  if (mimeType === 'application/vnd.google-apps.presentation') return 'Slides';
  if (mimeType === 'application/vnd.google-apps.folder') return 'Folder';
  if (mimeType === 'application/pdf') return 'PDF';
  if (mimeType.startsWith('video/')) return 'Video';
  if (mimeType.startsWith('audio/')) return 'Audio';
  if (mimeType.startsWith('image/')) return 'Image';
  return mimeToExt(mimeType).toUpperCase();
}

function iconColor(mimeType: string): string {
  if (mimeType === 'application/vnd.google-apps.document') return '#4285F4';
  if (mimeType === 'application/vnd.google-apps.spreadsheet') return '#34A853';
  if (mimeType === 'application/vnd.google-apps.presentation') return '#FBBC04';
  if (mimeType === 'application/pdf') return 'var(--red, #e53e3e)';
  if (mimeType.startsWith('video/')) return 'var(--navy, #1a365d)';
  if (mimeType.startsWith('audio/')) return '#9f7aea';
  return 'var(--text3)';
}

function FileIcon({ mimeType, size = 22 }: { mimeType: string; size?: number }) {
  const color = iconColor(mimeType);
  if (mimeType === 'application/vnd.google-apps.folder') return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none">
      <path d="M10 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-8l-2-2z"/>
    </svg>
  );
  if (mimeType.startsWith('video/')) return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>
    </svg>
  );
  if (mimeType.startsWith('audio/')) return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
    </svg>
  );
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
    </svg>
  );
}

function formatBytes(bytes?: string): string {
  if (!bytes) return '';
  const n = parseInt(bytes);
  if (isNaN(n)) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(iso?: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function Library() {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    fetch('/api/drive')
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setFiles(data);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const typeLabels = ['All', ...Array.from(new Set(files.map(f => mimeLabel(f.mimeType))))].sort((a, b) => a === 'All' ? -1 : b === 'All' ? 1 : a.localeCompare(b));

  const filtered = files.filter(f => {
    const matchSearch = !search || f.name.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'All' || mimeLabel(f.mimeType) === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div className="s-backbone">
      <div className="main" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px 0', flexShrink: 0 }}>
          <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>
            Season 6 · 2026
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', flex: 1 }}>Library</div>
            <a
              href={`https://drive.google.com/drive/folders/${process.env.NEXT_PUBLIC_GOOGLE_DRIVE_FOLDER_ID ?? '13zyxuhwWghNq-CCPoEG4ROlfJwBl6DOc'}`}
              target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 14px', height: 34, borderRadius: 8, border: '1px solid var(--line)', background: 'none', color: 'var(--text3)', fontSize: 12, textDecoration: 'none', flexShrink: 0 }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              Open in Drive
            </a>
          </div>

          {/* Search + filter row */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 160 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search files…"
                style={{ width: '100%', boxSizing: 'border-box', height: 34, paddingLeft: 30, paddingRight: 10, border: '1px solid var(--line)', borderRadius: 8, background: 'var(--bg2)', fontSize: 13, color: 'var(--text)', fontFamily: 'inherit', outline: 'none' }}
              />
            </div>
            {typeLabels.map(t => (
              <button key={t} onClick={() => setFilter(t)} style={{ height: 34, padding: '0 14px', borderRadius: 20, border: '1px solid', cursor: 'pointer', fontSize: 12, fontWeight: 500, fontFamily: 'inherit', background: filter === t ? 'var(--navy)' : 'var(--bg2)', borderColor: filter === t ? 'var(--navy)' : 'var(--line)', color: filter === t ? '#fff' : 'var(--text2)', flexShrink: 0 }}>
                {t}
              </button>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 24px 24px' }}>
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: 10, color: 'var(--text4)', fontSize: 13 }}>
              <span style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid var(--line)', borderTopColor: 'var(--green)', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
              Loading files…
            </div>
          )}

          {error && (
            <div style={{ padding: '16px 18px', borderRadius: 8, background: 'var(--rg, rgba(229,62,62,0.08))', border: '1px solid var(--rb, rgba(229,62,62,0.2))', fontSize: 13, color: 'var(--red, #e53e3e)', marginTop: 8 }}>
              {error}
            </div>
          )}

          {!loading && !error && filtered.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: 10, color: 'var(--text4)' }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
              <div style={{ fontSize: 14 }}>{search ? 'No files match your search' : 'No files in this folder'}</div>
            </div>
          )}

          {!loading && !error && filtered.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
              {filtered.map(f => (
                <a
                  key={f.id}
                  href={f.webViewLink ?? `https://drive.google.com/file/d/${f.id}/view`}
                  target="_blank" rel="noopener noreferrer"
                  style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: '14px 16px', background: 'var(--bg2)', border: '1px solid var(--line)', borderRadius: 10, textDecoration: 'none', transition: 'box-shadow 0.15s, border-color 0.15s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 12px rgba(10,22,40,0.07)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--text4)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'none'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--line)'; }}
                >
                  <div style={{ flexShrink: 0, width: 40, height: 40, borderRadius: 8, background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FileIcon mimeType={f.mimeType} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</div>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={{ fontSize: 9, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: iconColor(f.mimeType), background: 'var(--bg3)', borderRadius: 3, padding: '1px 5px' }}>
                        {mimeLabel(f.mimeType)}
                      </span>
                      {f.size && <span style={{ fontSize: 11, color: 'var(--text4)' }}>{formatBytes(f.size)}</span>}
                    </div>
                    {f.modifiedTime && <div style={{ fontSize: 11, color: 'var(--text4)', marginTop: 4 }}>{formatDate(f.modifiedTime)}</div>}
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
