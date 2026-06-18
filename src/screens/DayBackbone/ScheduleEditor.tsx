'use client';

import React, { useState, useRef } from 'react';
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
  background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 5,
  padding: '3px 8px', fontSize: 12, color: 'var(--text)', fontFamily: 'inherit',
  outline: 'none',
};

export default function ScheduleEditor({ events: initial, onSave, onCancel }: Props) {
  const [events, setEvents] = useState<ScheduleEvent[]>(initial);
  const [showTemplates, setShowTemplates] = useState(false);
  const dragIdx = useRef<number | null>(null);
  const dragOverIdx = useRef<number | null>(null);

  // ── Drag-and-drop ──────────────────────────────────────────────
  function onDragStart(idx: number) { dragIdx.current = idx; }

  function onDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault();
    dragOverIdx.current = idx;
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const from = dragIdx.current;
    const to   = dragOverIdx.current;
    if (from === null || to === null || from === to) return;
    const next = [...events];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setEvents(next);
    dragIdx.current = null;
    dragOverIdx.current = null;
  }

  // ── Event mutations ────────────────────────────────────────────
  function updateField<K extends keyof ScheduleEvent>(idx: number, key: K, val: ScheduleEvent[K]) {
    setEvents(prev => prev.map((ev, i) => i === idx ? { ...ev, [key]: val } : ev));
  }

  function removeEvent(idx: number) {
    setEvents(prev => prev.filter((_, i) => i !== idx));
  }

  function addTemplate(tmpl: Omit<ScheduleEvent, 'id'>) {
    setEvents(prev => [...prev, { ...tmpl, id: newId() }]);
    setShowTemplates(false);
  }

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div style={{
      borderTop: '1px solid var(--line)', background: 'var(--bg2)',
      padding: '14px 16px 16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{
          fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase',
          color: 'var(--text3)', fontFamily: "'Barlow Condensed', sans-serif",
        }}>
          Schedule Editor
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={onCancel} style={btnSt}>Cancel</button>
          <button
            onClick={() => onSave(events)}
            style={{ ...btnSt, background: 'var(--navy)', color: '#fff', borderColor: 'var(--navy)', fontWeight: 600 }}
          >
            Save
          </button>
        </div>
      </div>

      {/* Event rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
        {events.map((ev, idx) => (
          <div
            key={ev.id}
            draggable
            onDragStart={() => onDragStart(idx)}
            onDragOver={e => onDragOver(e, idx)}
            onDrop={onDrop}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'var(--bg)', border: '1px solid var(--line)',
              borderRadius: 8, padding: '7px 10px', cursor: 'grab',
              userSelect: 'none',
            }}
          >
            {/* Drag handle */}
            <svg width="10" height="14" viewBox="0 0 10 14" fill="var(--text4)" style={{ flexShrink: 0, cursor: 'grab' }}>
              <circle cx="3" cy="2" r="1.2"/><circle cx="7" cy="2" r="1.2"/>
              <circle cx="3" cy="7" r="1.2"/><circle cx="7" cy="7" r="1.2"/>
              <circle cx="3" cy="12" r="1.2"/><circle cx="7" cy="12" r="1.2"/>
            </svg>

            {/* Time */}
            <input
              value={ev.time}
              onChange={e => updateField(idx, 'time', e.target.value)}
              placeholder="HH:MM"
              style={{ ...inputSt, width: 52, textAlign: 'center' }}
              onClick={e => e.stopPropagation()}
            />

            {/* Label */}
            <input
              value={ev.label}
              onChange={e => updateField(idx, 'label', e.target.value)}
              placeholder="Event name…"
              style={{ ...inputSt, flex: 1, minWidth: 80 }}
              onClick={e => e.stopPropagation()}
            />

            {/* Tag */}
            <input
              value={ev.tag}
              onChange={e => updateField(idx, 'tag', e.target.value)}
              placeholder="Tag"
              style={{ ...inputSt, width: 60 }}
              onClick={e => e.stopPropagation()}
            />

            {/* Drive URL */}
            <DriveInput
              value={ev.driveUrl ?? ''}
              onChange={val => updateField(idx, 'driveUrl', val || undefined)}
            />

            {/* Delete */}
            <button
              onClick={() => removeEvent(idx)}
              style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text4)', padding: '0 2px', lineHeight: 1 }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        ))}
      </div>

      {/* Add event */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setShowTemplates(v => !v)}
          style={{ ...btnSt, display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text2)' }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add event
        </button>

        {showTemplates && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, zIndex: 50,
            background: 'var(--bg2)', border: '1px solid var(--line)',
            borderRadius: 10, boxShadow: '0 8px 24px rgba(10,14,20,0.18)',
            padding: '10px 0', minWidth: 260, marginTop: 4,
          }}>
            <div style={{ padding: '0 12px 6px', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text4)', fontFamily: "'Barlow Condensed', sans-serif" }}>
              Standard events
            </div>
            {TEMPLATE_GROUPS.map(group => (
              <div key={group.group}>
                <div style={{ padding: '5px 12px 3px', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text3)', fontFamily: "'Barlow Condensed', sans-serif" }}>
                  {group.group}
                </div>
                {group.events.map((tmpl, i) => (
                  <button
                    key={i}
                    onClick={() => addTemplate(tmpl)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      width: '100%', textAlign: 'left', background: 'none',
                      border: 'none', cursor: 'pointer', padding: '5px 12px',
                      fontFamily: 'inherit', fontSize: 13, color: 'var(--text2)',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg3)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                  >
                    <span style={{ fontSize: 11, color: 'var(--text4)', minWidth: 34, fontFamily: 'monospace' }}>{tmpl.time}</span>
                    <span style={{ flex: 1 }}>{tmpl.label}</span>
                    {tmpl.tag && (
                      <span style={{ fontSize: 10, color: tmpl.tagColor ?? TAG_COLORS[tmpl.tag] ?? 'var(--text4)', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                        {tmpl.tag}
                      </span>
                    )}
                    {tmpl.panelKey && (
                      <span style={{ fontSize: 9, color: 'var(--green)', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', background: 'var(--gg)', borderRadius: 3, padding: '1px 4px' }}>
                        panel
                      </span>
                    )}
                  </button>
                ))}
              </div>
            ))}
            <div style={{ borderTop: '1px solid var(--line)', margin: '6px 12px 0' }} />
            <button
              onClick={() => {
                addTemplate({ time: '—', label: '', tag: '', tagColor: 'var(--text3)' });
                setShowTemplates(false);
              }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: '6px 12px', fontFamily: 'inherit', fontSize: 13, color: 'var(--text3)' }}
            >
              <span style={{ fontSize: 11, color: 'var(--text4)', minWidth: 34 }}>—</span>
              Blank event
            </button>
          </div>
        )}
      </div>

      <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text4)' }}>
        Drag rows to reorder. Changes are saved per device until Viktor's backend is connected.
      </div>
    </div>
  );
}

function DriveInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const hasDrive = !!value;

  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <button
        title={hasDrive ? 'Edit Drive link' : 'Add Drive link'}
        onClick={e => { e.stopPropagation(); setOpen(v => !v); }}
        style={{
          background: hasDrive ? 'var(--gg)' : 'none',
          border: `1px solid ${hasDrive ? 'var(--gb)' : 'var(--line)'}`,
          borderRadius: 5, padding: '3px 6px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 4,
          color: hasDrive ? 'var(--green)' : 'var(--text4)',
        }}
      >
        <DriveIcon size={11} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '110%', right: 0, zIndex: 60,
          background: 'var(--bg2)', border: '1px solid var(--line)',
          borderRadius: 8, padding: '8px 10px', boxShadow: '0 4px 16px rgba(10,14,20,0.16)',
          minWidth: 260,
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text4)', fontFamily: "'Barlow Condensed', sans-serif", marginBottom: 5 }}>
            Google Drive link
          </div>
          <input
            autoFocus
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder="https://drive.google.com/…"
            style={{ ...inputSt, width: '100%', boxSizing: 'border-box' }}
            onClick={e => e.stopPropagation()}
          />
          <div style={{ display: 'flex', gap: 6, marginTop: 7 }}>
            {value && (
              <button onClick={() => { onChange(''); setOpen(false); }} style={{ ...btnSt, color: 'var(--red)', fontSize: 11 }}>
                Remove
              </button>
            )}
            <button onClick={() => setOpen(false)} style={{ ...btnSt, marginLeft: 'auto', fontSize: 11 }}>
              Done
            </button>
          </div>
        </div>
      )}
    </div>
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

const btnSt: React.CSSProperties = {
  padding: '5px 11px', borderRadius: 6, border: '1px solid var(--line)',
  background: 'none', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', color: 'var(--text3)',
};
