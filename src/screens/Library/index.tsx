'use client';

import React, { useState, useEffect } from 'react';

interface DriveFile {
  id: string; name: string; mimeType: string;
  size?: string | null; modifiedTime?: string | null; webViewLink?: string | null;
  regatta: string; category: string;
}

type MobileView = 'regattas' | 'files' | 'viewer';

function driveEmbedUrl(url: string): string {
  // Native Google Docs/Sheets/Slides/Forms
  if (/docs\.google\.com\/(document|spreadsheets|presentation|forms)/.test(url)) {
    return url.replace(/\/(edit|view|htmlview)(\?.*)?$/, '/preview');
  }
  // Any other Drive file — extract ID and use /preview (renders .docx .xlsx .pptx etc.)
  const fileId = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)?.[1]
    ?? url.match(/[?&]id=([a-zA-Z0-9_-]+)/)?.[1]
    ?? url.match(/\/d\/([a-zA-Z0-9_-]+)/)?.[1];
  if (fileId) return `https://drive.google.com/file/d/${fileId}/preview`;
  return url;
}

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

const BackIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
);

function stripPrefix(name: string): string {
  return name.replace(/^\d{2}-/, '');
}

function formatDate(iso?: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function Library() {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRegatta, setSelectedRegatta] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<DriveFile | null>(null);
  const [search, setSearch] = useState('');
  const [mobileView, setMobileView] = useState<MobileView>('regattas');

  useEffect(() => {
    fetch('/api/drive')
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setFiles(data);
        const regattas = Array.from(new Set((data as DriveFile[]).map((f: DriveFile) => f.regatta))).sort().reverse();
        if (regattas.length > 0) setSelectedRegatta(regattas[0] as string);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const regattas = Array.from(new Set(files.map(f => f.regatta))).sort((a, b) => b.localeCompare(a));

  const visibleFiles = files.filter(f => {
    const matchRegatta = !selectedRegatta || f.regatta === selectedRegatta;
    const matchSearch = !search
      || f.name.toLowerCase().includes(search.toLowerCase())
      || f.category.toLowerCase().includes(search.toLowerCase());
    return matchRegatta && matchSearch;
  });

  const byCategory = visibleFiles.reduce<Record<string, DriveFile[]>>((acc, f) => {
    const key = f.category || 'Other';
    (acc[key] ??= []).push(f);
    return acc;
  }, {});
  const sortedCategories = Object.keys(byCategory).sort();

  const canEmbed = (f: DriveFile) =>
    !!f.webViewLink && (
      f.mimeType.includes('google-apps') ||
      f.mimeType === 'application/pdf' ||
      f.mimeType.includes('officedocument') ||  // .docx .xlsx .pptx
      f.mimeType.includes('opendocument') ||    // .odt .ods .odp
      f.mimeType.startsWith('image/')
    );

  function pickRegatta(r: string) {
    setSelectedRegatta(r);
    setSelectedFile(null);
    setSearch('');
    setMobileView('files');
  }

  function pickFile(f: DriveFile) {
    setSelectedFile(prev => prev?.id === f.id ? null : f);
    setMobileView('viewer');
  }

  // ── Panels ────────────────────────────────────────────────────────────────

  const RegattaPanel = (
    <div className="lib-panel lib-regattas">
      <div className="lib-panel-header">
        <div className="lib-label">Season 6 · 2026</div>
        <div className="lib-title">Library</div>
      </div>
      <div className="lib-scroll">
        {loading && <div className="lib-empty">Loading…</div>}
        {error && <div className="lib-empty lib-error">{error}</div>}
        {regattas.map(r => (
          <button key={r} className={`lib-row lib-regatta-btn${selectedRegatta === r ? ' active' : ''}`}
            onClick={() => pickRegatta(r)}>
            {stripPrefix(r)}
            <svg className="lib-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        ))}
      </div>
      <div className="lib-panel-footer">
        <a href="https://drive.google.com/drive/folders/1MfoIcFbP0zlAxMNwgMQN4cu-YHCpdquF"
          target="_blank" rel="noopener noreferrer" className="lib-drive-link">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
            <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
          Open in Drive
        </a>
      </div>
    </div>
  );

  const FilePanel = (
    <div className="lib-panel lib-files">
      <div className="lib-panel-header lib-files-header">
        <button className="lib-back" onClick={() => setMobileView('regattas')}><BackIcon /></button>
        <span className="lib-header-title">{selectedRegatta ? stripPrefix(selectedRegatta) : 'Files'}</span>
      </div>
      <div className="lib-search-bar">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lib-search-icon">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" className="lib-search-input" />
      </div>
      <div className="lib-scroll">
        {!loading && !error && visibleFiles.length === 0 && <div className="lib-empty">No files</div>}
        {sortedCategories.map(cat => (
          <div key={cat}>
            {cat !== 'Other' && (
              <div className="lib-cat-label">{stripPrefix(cat)}</div>
            )}
            {byCategory[cat].map(f => (
              <button key={f.id}
                className={`lib-row lib-file-btn${selectedFile?.id === f.id ? ' active' : ''}`}
                onClick={() => pickFile(f)}>
                <span className="lib-file-icon"><FileIcon mimeType={f.mimeType} /></span>
                <div className="lib-file-info">
                  <div className="lib-file-name">{f.name}</div>
                  <div className="lib-file-date">{formatDate(f.modifiedTime)}</div>
                </div>
                <svg className="lib-chevron lib-chevron-file" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );

  const ViewerPanel = (
    <div className="lib-panel lib-viewer">
      {selectedFile ? (
        <>
          <div className="lib-panel-header lib-viewer-header">
            <button className="lib-back" onClick={() => setMobileView('files')}><BackIcon /></button>
            <FileIcon mimeType={selectedFile.mimeType} size={13} />
            <span className="lib-header-title lib-viewer-title">{selectedFile.name}</span>
            <span className="lib-type-badge" style={{ color: mimeColor(selectedFile.mimeType) }}>
              {mimeLabel(selectedFile.mimeType)}
            </span>
            {selectedFile.webViewLink && (
              <a href={selectedFile.webViewLink} target="_blank" rel="noopener noreferrer" className="lib-drive-ext">↗</a>
            )}
          </div>
          {canEmbed(selectedFile) && selectedFile.webViewLink ? (
            <iframe key={selectedFile.id} src={driveEmbedUrl(selectedFile.webViewLink)}
              className="lib-iframe" allow="autoplay" title={selectedFile.name} />
          ) : (
            <div className="lib-no-preview">
              <FileIcon mimeType={selectedFile.mimeType} size={40} />
              <div className="lib-no-preview-name">{selectedFile.name}</div>
              <div className="lib-no-preview-sub">Preview not available for this file type</div>
              {selectedFile.webViewLink && (
                <a href={selectedFile.webViewLink} target="_blank" rel="noopener noreferrer" className="lib-open-btn">
                  Open in Drive
                </a>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="lib-no-preview">
          <div className="lib-no-preview-sub">Select a file to preview</div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop: 3-column */}
      <div className="s-backbone lib-desktop" style={{ overflow: 'hidden' }}>
        {RegattaPanel}
        {FilePanel}
        {selectedFile && ViewerPanel}
      </div>

      {/* Mobile: stacked views */}
      <div className="lib-mobile">
        {mobileView === 'regattas' && RegattaPanel}
        {mobileView === 'files' && FilePanel}
        {mobileView === 'viewer' && ViewerPanel}
      </div>

      <style>{`
        /* ── Layout ───────────────────────────────── */
        .lib-desktop { display: flex !important; }
        .lib-mobile  { display: none; }

        @media (max-width: 640px) {
          .lib-desktop { display: none !important; }
          .lib-mobile  { display: flex; flex-direction: column; height: 100%; overflow: hidden; }
        }

        /* ── Panel base ───────────────────────────── */
        .lib-panel {
          display: flex; flex-direction: column; overflow: hidden; height: 100%;
        }
        .lib-regattas {
          width: 200px; flex-shrink: 0; border-right: 1px solid var(--line);
        }
        .lib-files {
          flex-shrink: 0; border-right: 1px solid var(--line);
        }
        .lib-viewer { flex: 1; min-width: 0; }

        /* On mobile all panels fill full width */
        .lib-mobile .lib-panel { width: 100%; flex: 1; }
        .lib-mobile .lib-regattas,
        .lib-mobile .lib-files { border-right: none; width: 100%; }

        /* Desktop file list width */
        .lib-desktop .lib-files { width: 280px; }
        .lib-desktop .lib-files.has-viewer { width: 280px; }
        .lib-desktop .lib-files:not(.has-viewer) { flex: 1; }

        /* ── Headers ──────────────────────────────── */
        .lib-panel-header {
          padding: 14px 16px 12px; border-bottom: 1px solid var(--line); flex-shrink: 0;
        }
        .lib-label {
          font-size: 9px; font-family: 'Barlow Condensed', sans-serif; font-weight: 700;
          letter-spacing: 0.16em; text-transform: uppercase; color: var(--text4); margin-bottom: 4px;
        }
        .lib-title { font-size: 18px; font-weight: 700; color: var(--text); }

        .lib-files-header, .lib-viewer-header {
          display: flex; align-items: center; gap: 8px;
          padding: 10px 14px; background: var(--bg2);
        }
        .lib-header-title {
          flex: 1; font-size: 14px; font-weight: 600; color: var(--text);
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .lib-viewer-title { font-size: 13px; }

        /* Hide back button on desktop */
        .lib-desktop .lib-back { display: none; }
        .lib-back {
          display: flex; align-items: center; justify-content: center;
          background: none; border: none; cursor: pointer; padding: 4px;
          color: var(--text2); flex-shrink: 0; border-radius: 5px;
        }
        .lib-back:active { background: var(--bg3); }

        /* ── Search ───────────────────────────────── */
        .lib-search-bar {
          position: relative; padding: 10px 12px 8px; flex-shrink: 0;
          border-bottom: 1px solid var(--line);
        }
        .lib-search-icon {
          position: absolute; left: 21px; top: 50%; transform: translateY(-50%);
          pointer-events: none;
        }
        .lib-search-input {
          width: 100%; box-sizing: border-box; height: 32px; padding-left: 28px;
          padding-right: 10px; border: 1px solid var(--line); border-radius: 7px;
          background: var(--bg2); font-size: 13px; color: var(--text);
          font-family: inherit; outline: none;
        }

        /* ── Scroll area ──────────────────────────── */
        .lib-scroll { flex: 1; overflow-y: auto; padding: 6px 0; }
        .lib-empty { padding: 40px 16px; text-align: center; font-size: 13px; color: var(--text4); }
        .lib-error { color: var(--red); }

        /* ── Rows ─────────────────────────────────── */
        .lib-row {
          display: flex; align-items: center; width: 100%; text-align: left;
          background: none; border: none; cursor: pointer; font-family: inherit;
          border-left: 2px solid transparent; padding: 0;
        }
        .lib-regatta-btn {
          padding: 10px 14px; font-size: 14px; font-weight: 400; color: var(--text2);
          justify-content: space-between;
        }
        .lib-regatta-btn.active {
          background: var(--gg); color: var(--green); font-weight: 600;
          border-left-color: var(--green);
        }
        .lib-regatta-btn:not(.active):hover { background: var(--bg2); }

        .lib-chevron { color: var(--text4); flex-shrink: 0; }
        .lib-regatta-btn.active .lib-chevron { color: var(--green); }

        .lib-cat-label {
          padding: 10px 16px 3px; font-size: 9px; font-weight: 700;
          letter-spacing: 0.12em; text-transform: uppercase; color: var(--text4);
          font-family: 'Barlow Condensed', sans-serif;
        }

        .lib-file-btn {
          gap: 10px; padding: 9px 14px;
        }
        .lib-file-btn.active { background: var(--gg); border-left-color: var(--green); }
        .lib-file-btn:not(.active):hover { background: var(--bg2); }
        .lib-chevron-file { color: var(--line); }
        .lib-file-btn:hover .lib-chevron-file,
        .lib-file-btn.active .lib-chevron-file { color: var(--text4); }

        /* Hide file chevron on desktop */
        .lib-desktop .lib-chevron-file { display: none; }

        .lib-file-icon { flex-shrink: 0; margin-top: 1px; }
        .lib-file-info { flex: 1; min-width: 0; }
        .lib-file-name {
          font-size: 13px; font-weight: 500; color: var(--text);
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap; line-height: 1.3;
        }
        .lib-file-date { font-size: 10px; color: var(--text4); margin-top: 1px; }

        /* ── Viewer ───────────────────────────────── */
        .lib-type-badge {
          font-size: 10px; font-weight: 700; letter-spacing: 0.08em;
          text-transform: uppercase; background: var(--bg3); border-radius: 3px;
          padding: 2px 5px; flex-shrink: 0;
        }
        .lib-drive-ext {
          font-size: 12px; color: var(--text4); text-decoration: none; flex-shrink: 0;
        }
        .lib-iframe {
          flex: 1; border: none; display: block; width: 100%; min-height: 0;
        }
        .lib-no-preview {
          flex: 1; display: flex; flex-direction: column; align-items: center;
          justify-content: center; gap: 12px; color: var(--text4);
        }
        .lib-no-preview-name { font-size: 14px; color: var(--text2); font-weight: 500; }
        .lib-no-preview-sub { font-size: 12px; color: var(--text4); }
        .lib-open-btn {
          margin-top: 4px; padding: 8px 20px; border-radius: 7px;
          background: var(--navy); color: #fff; font-size: 13px; font-weight: 600;
          text-decoration: none;
        }

        /* ── Footer ───────────────────────────────── */
        .lib-panel-footer {
          padding: 10px 12px; border-top: 1px solid var(--line); flex-shrink: 0;
        }
        .lib-drive-link {
          display: flex; align-items: center; gap: 5px;
          font-size: 11px; color: var(--text4); text-decoration: none;
        }
      `}</style>
    </>
  );
}
