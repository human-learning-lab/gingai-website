'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { type ScheduleEvent, TEMPLATE_GROUPS } from '@/types/schedule';
import { newId } from '@/lib/scheduleApi';

interface Props {
  events: ScheduleEvent[];
  onSave: (events: ScheduleEvent[]) => void;
  onCancel: () => void;
}

const TAG_COLORS: Record<string, string> = {
  'Hotel': 'var(--text3)', 'Venue': 'var(--yellow)', 'Lunch': 'var(--text3)',
  'Travel': 'var(--text4)', 'Boat': 'var(--text3)', 'Race': 'var(--yellow)',
  'Team': 'var(--text3)', 'Sim': 'var(--text3)', 'Learn': 'var(--text3)',
  'Media': 'var(--text4)', 'Brief': 'var(--text3)', 'Capture': 'var(--red)',
  'Debrief': 'var(--text3)', 'Live': 'var(--red)',
};

const inputSt: React.CSSProperties = {
  background: 'var(--bg3)', border: '1px solid var(--line)', borderRadius: 6,
  padding: '6px 10px', fontSize: 13, color: 'var(--text)', fontFamily: 'inherit',
  outline: 'none', width: '100%', boxSizing: 'border-box',
};

const btnSt: React.CSSProperties = {
  padding: '7px 16px', borderRadius: 7, border: '1px solid var(--line)',
  background: 'none', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
  color: 'var(--text3)',
};

// ── Time helpers ─────────────────────────────────────────────────────────────
function toMins(t: string): number | null {
  const m = t.match(/^(\d{1,2}):(\d{2})$/);
  return m ? parseInt(m[1]) * 60 + parseInt(m[2]) : null;
}
function fromMins(m: number): string {
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}
function interpolateTime(evs: ScheduleEvent[], idx: number): string | null {
  const prev = evs.slice(0, idx).reverse().find(e => toMins(e.time) !== null);
  const next = evs.slice(idx + 1).find(e => toMins(e.time) !== null);
  const pm = prev ? toMins(prev.time) : null;
  const nm = next ? toMins(next.time) : null;
  if (pm !== null && nm !== null && nm > pm) return fromMins(Math.round((pm + nm) / 2));
  if (pm !== null && nm === null) return fromMins(pm + 30);
  return null;
}

export default function ScheduleEditor({ events: initial, onSave, onCancel }: Props) {
  const [events, setEvents] = useState<ScheduleEvent[]>(initial);
  const [driveOpen, setDriveOpen] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [activeTab, setActiveTab] = useState<'schedule' | 'add'>('schedule');

  // ── Pointer-based drag state ──────────────────────────────────
  const [dragging, setDragging] = useState<number | null>(null);
  const [insertBefore, setInsertBefore] = useState<number | null>(null);
  const [ghostPos, setGhostPos] = useState<{ x: number; y: number } | null>(null);
  const [mapsOpen, setMapsOpen] = useState<number | null>(null);
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const listRef = useRef<HTMLDivElement>(null);

  function toggleDrive(idx: number) {
    setDriveOpen(prev => prev === idx ? null : idx);
    setMapsOpen(null);
  }

  function toggleMaps(idx: number) {
    setMapsOpen(prev => prev === idx ? null : idx);
    setDriveOpen(null);
  }

  useEffect(() => {
    setMounted(true);
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onCancel]);

  // ── Pointer drag handlers ─────────────────────────────────────
  function handlePointerDown(e: React.PointerEvent, idx: number) {
    // Only trigger from the handle (svg), not input fields
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDragging(idx);
    setInsertBefore(idx);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (dragging === null) return;
    setGhostPos({ x: e.clientX, y: e.clientY });
    const y = e.clientY;
    let target = events.length;
    for (let i = 0; i < rowRefs.current.length; i++) {
      const row = rowRefs.current[i];
      if (!row) continue;
      const rect = row.getBoundingClientRect();
      if (y < rect.top + rect.height / 2) { target = i; break; }
    }
    setInsertBefore(target);
  }

  function handlePointerUp() {
    if (dragging === null || insertBefore === null) { setDragging(null); setInsertBefore(null); setGhostPos(null); return; }
    const from = dragging;
    // Compute effective insert index after removing 'from'
    let to = insertBefore > from ? insertBefore - 1 : insertBefore;
    if (to === from) { setDragging(null); setInsertBefore(null); return; }

    const next = [...events];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);

    // Auto-interpolate time if moved item's time looks like a template default
    // (we update it if there's a logical slot between neighbors)
    const suggested = interpolateTime(next, to);
    if (suggested) {
      next[to] = { ...next[to], time: suggested };
    }

    setEvents(next);
    setDragging(null);
    setInsertBefore(null);
    setGhostPos(null);
  }

  // ── Mutations ─────────────────────────────────────────────────
  function updateField<K extends keyof ScheduleEvent>(idx: number, key: K, val: ScheduleEvent[K]) {
    setEvents(prev => prev.map((ev, i) => i === idx ? { ...ev, [key]: val } : ev));
  }

  function removeEvent(idx: number) {
    setEvents(prev => prev.filter((_, i) => i !== idx));
  }

  function addTemplate(tmpl: Omit<ScheduleEvent, 'id'>) {
    setEvents(prev => [...prev, { ...tmpl, id: newId() }]);
    if (isMobile) setActiveTab('schedule');
  }

  if (!mounted) return null;

  const draggedEv = dragging !== null ? events[dragging] : null;
  const ghost = draggedEv && ghostPos ? createPortal(
    <div style={{
      position: 'fixed',
      left: ghostPos.x + 14,
      top: ghostPos.y - 18,
      zIndex: 1100,
      pointerEvents: 'none',
      background: 'var(--bg)',
      border: '1.5px solid var(--navy)',
      borderRadius: 9,
      padding: '7px 14px',
      boxShadow: '0 8px 28px rgba(0,0,0,0.28)',
      display: 'flex', alignItems: 'center', gap: 10,
      minWidth: 180, maxWidth: 320,
      opacity: 0.96,
    }}>
      <svg width="10" height="14" viewBox="0 0 10 14" fill="var(--text4)">
        <circle cx="3" cy="2" r="1.2"/><circle cx="7" cy="2" r="1.2"/>
        <circle cx="3" cy="7" r="1.2"/><circle cx="7" cy="7" r="1.2"/>
        <circle cx="3" cy="12" r="1.2"/><circle cx="7" cy="12" r="1.2"/>
      </svg>
      <span style={{ fontSize: 12, color: 'var(--text4)', fontFamily: 'monospace', flexShrink: 0 }}>{draggedEv.time}</span>
      <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{draggedEv.label || 'Untitled'}</span>
      {draggedEv.tag && (
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: "'Barlow Condensed', sans-serif", color: draggedEv.tagColor ?? 'var(--text4)', flexShrink: 0 }}>
          {draggedEv.tag}
        </span>
      )}
    </div>,
    document.body
  ) : null;

  const templatePanel = (
    <>
      <div style={{
        fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase',
        color: 'var(--text4)', fontFamily: "'Barlow Condensed', sans-serif",
        marginBottom: 12,
      }}>
        Add from templates
      </div>
      {TEMPLATE_GROUPS.map(group => (
        <div key={group.group} style={{ marginBottom: 14 }}>
          <div style={{
            fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
            color: 'var(--text4)', fontFamily: "'Barlow Condensed', sans-serif",
            marginBottom: 6, paddingLeft: 2,
          }}>
            {group.group}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {group.events.map((tmpl, i) => {
              const color = tmpl.tagColor ?? TAG_COLORS[tmpl.tag ?? ''] ?? 'var(--text3)';
              return (
                <button
                  key={i}
                  onClick={() => addTemplate(tmpl)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '9px 12px', borderRadius: 8,
                    border: '1px solid var(--line)',
                    background: 'var(--bg)', cursor: 'pointer',
                    fontFamily: 'inherit', textAlign: 'left', width: '100%',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg3)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg)')}
                >
                  {tmpl.panelKey && (
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--green)', flexShrink: 0 }} />
                  )}
                  <span style={{ flex: 1, fontSize: 13, color: 'var(--text2)', lineHeight: 1.3 }}>{tmpl.label}</span>
                  {tmpl.tag && (
                    <span style={{ fontSize: 9, color, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', flexShrink: 0 }}>
                      {tmpl.tag}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <div style={{ borderTop: '1px solid var(--line)', paddingTop: 10, marginTop: 4 }}>
        <button
          onClick={() => addTemplate({ time: '—', label: '', tag: '', tagColor: 'var(--text3)' })}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '9px 12px', borderRadius: 8,
            border: '1px dashed var(--line2)',
            background: 'none', cursor: 'pointer',
            fontFamily: 'inherit', width: '100%',
            fontSize: 13, color: 'var(--text4)',
          }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Blank event
        </button>
      </div>
    </>
  );

  const schedulePanel = (
    <>
      {!isMobile && (
        <div style={{
          fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase',
          color: 'var(--text4)', fontFamily: "'Barlow Condensed', sans-serif",
          marginBottom: 12,
        }}>
          Schedule — drag to reorder
        </div>
      )}
      {events.length === 0 && (
        <div style={{
          border: '2px dashed var(--line)', borderRadius: 10,
          padding: '32px 20px', textAlign: 'center',
          color: 'var(--text4)', fontSize: 13,
        }}>
          {isMobile ? 'Tap "Add" to add events' : 'No events yet — add from templates on the left'}
        </div>
      )}
      <div
        ref={listRef}
        style={{ display: 'flex', flexDirection: 'column', gap: 0, cursor: dragging !== null ? 'grabbing' : 'default' }}
        onPointerMove={dragging !== null ? handlePointerMove : undefined}
        onPointerUp={dragging !== null ? handlePointerUp : undefined}
        onPointerCancel={() => { setDragging(null); setInsertBefore(null); setGhostPos(null); }}
      >
        {events.map((ev, idx) => (
          <div key={ev.id}>
            {/* Insertion indicator line */}
            {dragging !== null && insertBefore === idx && dragging !== idx && (
              <div style={{ height: 3, borderRadius: 2, background: 'var(--navy)', margin: '2px 0', transition: 'opacity 0.1s' }} />
            )}
            <div
              ref={el => { rowRefs.current[idx] = el; }}
              style={{
                display: 'flex', flexDirection: 'column',
                background: dragging === idx ? 'var(--bg3)' : 'var(--bg2)',
                border: `1px solid ${dragging === idx ? 'var(--navy)' : 'var(--line)'}`,
                borderRadius: 9, padding: '8px 12px',
                marginBottom: 4,
                opacity: dragging === idx ? 0.45 : 1,
                userSelect: 'none',
                transition: 'opacity 0.15s, border-color 0.1s',
              }}
            >
            {/* Row: drag | time | label | tag | drive-toggle | delete */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
              <svg
                width="10" height="14" viewBox="0 0 10 14" fill="var(--text4)"
                style={{ flexShrink: 0, cursor: 'grab', touchAction: 'none' }}
                onPointerDown={e => handlePointerDown(e, idx)}
              >
                <circle cx="3" cy="2" r="1.2"/><circle cx="7" cy="2" r="1.2"/>
                <circle cx="3" cy="7" r="1.2"/><circle cx="7" cy="7" r="1.2"/>
                <circle cx="3" cy="12" r="1.2"/><circle cx="7" cy="12" r="1.2"/>
              </svg>
              <input
                value={ev.time}
                onChange={e => updateField(idx, 'time', e.target.value)}
                placeholder="HH:MM"
                style={{ ...inputSt, width: isMobile ? 54 : 64, textAlign: 'center', flexShrink: 0, padding: '6px 6px' }}
                onClick={e => e.stopPropagation()}
              />
              <input
                value={ev.label}
                onChange={e => updateField(idx, 'label', e.target.value)}
                placeholder="Event name…"
                style={{ ...inputSt, flex: 1 }}
                onClick={e => e.stopPropagation()}
              />
              {!isMobile && (
                <input
                  value={ev.tag}
                  onChange={e => updateField(idx, 'tag', e.target.value)}
                  placeholder="Tag"
                  style={{ ...inputSt, width: 80, flexShrink: 0 }}
                  onClick={e => e.stopPropagation()}
                />
              )}
              {/* Drive toggle button */}
              <button
                title={ev.driveUrl ? 'Edit Drive link' : 'Add Drive link'}
                onClick={e => { e.stopPropagation(); toggleDrive(idx); }}
                style={{
                  flexShrink: 0,
                  background: ev.driveUrl ? 'var(--gg)' : 'none',
                  border: `1px solid ${ev.driveUrl ? 'var(--gb)' : 'var(--line)'}`,
                  borderRadius: 6, padding: '5px 7px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 4,
                  color: ev.driveUrl ? 'var(--green)' : 'var(--text4)',
                }}
              >
                <DriveIcon size={13} />
              </button>
              {/* Maps toggle button */}
              <button
                title={ev.mapsUrl ? 'Edit Maps link' : 'Add Maps link'}
                onClick={e => { e.stopPropagation(); toggleMaps(idx); }}
                style={{
                  flexShrink: 0,
                  background: ev.mapsUrl ? 'rgba(234,67,53,0.1)' : 'none',
                  border: `1px solid ${ev.mapsUrl ? 'rgba(234,67,53,0.35)' : 'var(--line)'}`,
                  borderRadius: 6, padding: '5px 7px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center',
                  color: ev.mapsUrl ? '#ea4335' : 'var(--text4)',
                }}
              >
                <MapsIcon size={13} />
              </button>
              <button
                onClick={() => removeEvent(idx)}
                style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text4)', padding: '4px', borderRadius: 4, lineHeight: 1 }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--red)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text4)'; }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            {/* Inline Maps URL input */}
            {mapsOpen === idx && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, paddingLeft: 18 }}>
                <MapsIcon size={12} />
                <input
                  autoFocus
                  value={ev.mapsUrl ?? ''}
                  onChange={e => updateField(idx, 'mapsUrl', e.target.value || undefined)}
                  placeholder="https://maps.google.com/…"
                  style={{ ...inputSt, flex: 1, fontSize: 12, padding: '5px 9px' }}
                  onClick={e => e.stopPropagation()}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') setMapsOpen(null); }}
                />
                {ev.mapsUrl && (
                  <button
                    onClick={() => { updateField(idx, 'mapsUrl', undefined); setMapsOpen(null); }}
                    style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', fontSize: 11, fontFamily: 'inherit', padding: '4px 6px' }}
                  >
                    Remove
                  </button>
                )}
                <button
                  onClick={() => setMapsOpen(null)}
                  style={{ flexShrink: 0, background: 'none', border: '1px solid var(--line)', cursor: 'pointer', color: 'var(--text3)', fontSize: 11, fontFamily: 'inherit', padding: '4px 9px', borderRadius: 6 }}
                >
                  Done
                </button>
              </div>
            )}
            {/* Inline Drive URL input */}
            {driveOpen === idx && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, paddingLeft: 18 }}>
                <DriveIcon size={12} />
                <input
                  autoFocus
                  value={ev.driveUrl ?? ''}
                  onChange={e => updateField(idx, 'driveUrl', e.target.value || undefined)}
                  placeholder="https://drive.google.com/…"
                  style={{ ...inputSt, flex: 1, fontSize: 12, padding: '5px 9px' }}
                  onClick={e => e.stopPropagation()}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') setDriveOpen(null); }}
                />
                {ev.driveUrl && (
                  <button
                    onClick={() => { updateField(idx, 'driveUrl', undefined); setDriveOpen(null); }}
                    style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', fontSize: 11, fontFamily: 'inherit', padding: '4px 6px' }}
                  >
                    Remove
                  </button>
                )}
                <button
                  onClick={() => setDriveOpen(null)}
                  style={{ flexShrink: 0, background: 'none', border: '1px solid var(--line)', cursor: 'pointer', color: 'var(--text3)', fontSize: 11, fontFamily: 'inherit', padding: '4px 9px', borderRadius: 6 }}
                >
                  Done
                </button>
              </div>
            )}
            </div>{/* end row card */}
          </div>
        ))}
        {/* Insertion indicator at end (append) */}
        {dragging !== null && insertBefore === events.length && (
          <div style={{ height: 3, borderRadius: 2, background: 'var(--navy)', margin: '2px 0' }} />
        )}
      </div>
    </>
  );

  const overlay = (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: isMobile ? 'var(--bg)' : 'rgba(8,10,14,0.72)',
        backdropFilter: isMobile ? 'none' : 'blur(4px)',
        display: 'flex', alignItems: isMobile ? 'stretch' : 'center',
        justifyContent: 'center',
        padding: isMobile ? 0 : 24,
      }}
      onClick={isMobile ? undefined : onCancel}
    >
      <div
        style={{
          background: 'var(--bg)',
          border: isMobile ? 'none' : '1px solid var(--line)',
          borderRadius: isMobile ? 0 : 14,
          boxShadow: isMobile ? 'none' : '0 24px 64px rgba(0,0,0,0.4)',
          width: '100%', maxWidth: isMobile ? '100%' : 860,
          maxHeight: isMobile ? '100%' : 'calc(100vh - 48px)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: isMobile ? '14px 16px' : '16px 20px',
          borderBottom: '1px solid var(--line)',
          flexShrink: 0,
        }}>
          <div>
            <div style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase',
              color: 'var(--text4)', fontFamily: "'Barlow Condensed', sans-serif", marginBottom: 2,
            }}>
              Schedule Editor
            </div>
            <div style={{ fontSize: isMobile ? 14 : 15, fontWeight: 600, color: 'var(--text)', lineHeight: 1 }}>
              Edit Event Schedule
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {!isMobile && <button onClick={onCancel} style={btnSt}>Cancel</button>}
            <button
              onClick={() => onSave(events)}
              style={{ ...btnSt, background: 'var(--navy)', color: '#fff', border: 'none', fontWeight: 600 }}
            >
              {isMobile ? 'Save' : 'Save changes'}
            </button>
            <button
              onClick={onCancel}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text4)', padding: '4px 6px' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile tabs */}
        {isMobile && (
          <div style={{
            display: 'flex', borderBottom: '1px solid var(--line)',
            flexShrink: 0,
          }}>
            {(['schedule', 'add'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  flex: 1, padding: '11px 0', border: 'none', cursor: 'pointer',
                  background: 'none', fontFamily: 'inherit',
                  fontSize: 13, fontWeight: activeTab === tab ? 600 : 400,
                  color: activeTab === tab ? 'var(--text)' : 'var(--text4)',
                  borderBottom: `2px solid ${activeTab === tab ? 'var(--navy)' : 'transparent'}`,
                  marginBottom: -1,
                }}
              >
                {tab === 'schedule' ? `Schedule (${events.length})` : '+ Add'}
              </button>
            ))}
          </div>
        )}

        {/* Body */}
        {isMobile ? (
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px' }}>
            {activeTab === 'schedule' ? schedulePanel : templatePanel}
          </div>
        ) : (
          <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>
            <div style={{
              width: 220, flexShrink: 0,
              borderRight: '1px solid var(--line)',
              overflowY: 'auto',
              padding: '16px 14px',
              background: 'var(--bg2)',
            }}>
              {templatePanel}
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px' }}>
              {schedulePanel}
            </div>
          </div>
        )}

        {/* Footer */}
        {!isMobile && (
          <div style={{
            borderTop: '1px solid var(--line)', padding: '9px 20px',
            fontSize: 11, color: 'var(--text4)', flexShrink: 0,
            display: 'flex', alignItems: 'center',
          }}>
            <span>Drag rows to reorder · green dot = linked panel content</span>
            <span style={{ marginLeft: 'auto' }}>Esc to cancel</span>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {createPortal(overlay, document.body)}
      {ghost}
    </>
  );
}


export function DriveIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
      <polyline points="14 2 14 8 20 8"/>
    </svg>
  );
}

export function MapsIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  );
}
