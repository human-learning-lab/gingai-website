'use client';

import { useState, useEffect, useId } from 'react';

// ── Types ──────────────────────────────────────────────────────

type Comparator = '>' | '<' | '>=' | '<=' | '==' | '!=';
type AlarmType  = 'positive' | 'negative' | 'neutral';

interface Condition {
  id: string;
  dataPoint: string;
  comparator: Comparator;
  value: string;
}

interface AlarmDef {
  id: string;
  name: string;
  type: AlarmType;
  message: string;
  conditions: Condition[];
  logic: 'AND' | 'OR';
  enabled: boolean;
}

// ── Constants ─────────────────────────────────────────────────

const DATA_POINTS = [
  'BOAT_SPEED_km_h_1',
  'BSP_kmh',
  'TWS_kmh',
  'TWA',
  'VMG_kmh',
  'Heel_n',
  'DB_STOW_STATE_P_unk',
  'DB_STOW_STATE_S_unk',
  'MAX_DIFF_ACTIVE_unk',
  'ANGLE_DB_P',
  'ANGLE_DB_S',
  'CANT_P',
  'CANT_S',
  'RUDDER_P',
  'RUDDER_S',
];

const COMPARATORS: { value: Comparator; label: string }[] = [
  { value: '>',  label: '> (greater than)' },
  { value: '<',  label: '< (less than)' },
  { value: '>=', label: '≥ (greater or equal)' },
  { value: '<=', label: '≤ (less or equal)' },
  { value: '==', label: '= (equals)' },
  { value: '!=', label: '≠ (not equals)' },
];

const TYPE_CONFIG = {
  positive: { label: 'Positive',  accent: '#00c24a' },
  negative: { label: 'Negative',  accent: '#e8001c' },
  neutral:  { label: 'Note',      accent: '#e07800' },
};

const STORAGE_KEY = 'gingai_alarms_v1';

function newCondition(): Condition {
  return { id: crypto.randomUUID(), dataPoint: DATA_POINTS[0], comparator: '>', value: '' };
}

function newAlarm(): Omit<AlarmDef, 'id'> {
  return {
    name: '',
    type: 'negative',
    message: '',
    conditions: [newCondition()],
    logic: 'AND',
    enabled: true,
  };
}

// ── Alarm card ────────────────────────────────────────────────

function AlarmCard({ alarm, onEdit, onDelete, onToggle }: {
  alarm: AlarmDef;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}) {
  const c = TYPE_CONFIG[alarm.type];
  return (
    <div style={{
      background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 10,
      padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8,
      opacity: alarm.enabled ? 1 : 0.5, transition: 'opacity 0.15s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%', background: c.accent, flexShrink: 0,
        }} />
        <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)', flex: 1 }}>{alarm.name || 'Unnamed alarm'}</span>
        <span style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700,
          letterSpacing: '0.15em', textTransform: 'uppercase',
          color: c.accent, background: `${c.accent}18`,
          border: `1px solid ${c.accent}40`, borderRadius: 4, padding: '2px 7px',
        }}>{c.label}</span>
        {/* Enable toggle */}
        <button onClick={onToggle} style={{
          width: 32, height: 18, borderRadius: 9, border: 'none', cursor: 'pointer',
          background: alarm.enabled ? 'var(--green)' : 'var(--line2)',
          position: 'relative', flexShrink: 0, transition: 'background 0.15s',
        }}>
          <div style={{
            position: 'absolute', top: 2, left: alarm.enabled ? 16 : 2,
            width: 14, height: 14, borderRadius: '50%', background: '#fff',
            transition: 'left 0.15s',
          }} />
        </button>
      </div>

      {/* Conditions preview */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {alarm.conditions.map((cond, i) => (
          <div key={cond.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text3)' }}>
            {i > 0 && <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 10, letterSpacing: '0.1em', color: 'var(--text4)', width: 28 }}>{alarm.logic}</span>}
            {i === 0 && <span style={{ width: 28 }} />}
            <code style={{ background: 'var(--bg3)', borderRadius: 3, padding: '1px 5px', fontSize: 11, color: 'var(--text2)', fontFamily: 'monospace' }}>
              {cond.dataPoint}
            </code>
            <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--text2)' }}>{cond.comparator}</span>
            <code style={{ background: 'var(--bg3)', borderRadius: 3, padding: '1px 5px', fontSize: 11, color: 'var(--text2)', fontFamily: 'monospace' }}>
              {cond.value || '…'}
            </code>
          </div>
        ))}
      </div>

      {/* Message */}
      {alarm.message && (
        <div style={{ fontSize: 12, color: 'var(--text3)', fontStyle: 'italic', borderTop: '1px solid var(--line)', paddingTop: 8 }}>
          "{alarm.message}"
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 6, paddingTop: 2 }}>
        <button onClick={onEdit} style={{
          height: 26, padding: '0 10px', borderRadius: 5,
          border: '1px solid var(--line)', background: 'transparent',
          fontSize: 11, cursor: 'pointer', color: 'var(--text3)', fontFamily: 'inherit',
        }}>Edit</button>
        <button onClick={onDelete} style={{
          height: 26, padding: '0 10px', borderRadius: 5,
          border: '1px solid var(--rb)', background: 'transparent',
          fontSize: 11, cursor: 'pointer', color: 'var(--red)', fontFamily: 'inherit',
        }}>Delete</button>
      </div>
    </div>
  );
}

// ── Builder form ──────────────────────────────────────────────

function AlarmBuilder({ initial, onSave, onCancel }: {
  initial?: AlarmDef;
  onSave: (a: Omit<AlarmDef, 'id'> & { id?: string }) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<Omit<AlarmDef, 'id'> & { id?: string }>(
    initial ?? newAlarm()
  );

  function setField<K extends keyof typeof form>(k: K, v: typeof form[K]) {
    setForm(f => ({ ...f, [k]: v }));
  }

  function updateCond(id: string, patch: Partial<Condition>) {
    setForm(f => ({ ...f, conditions: f.conditions.map(c => c.id === id ? { ...c, ...patch } : c) }));
  }

  function addCond() {
    setForm(f => ({ ...f, conditions: [...f.conditions, newCondition()] }));
  }

  function removeCond(id: string) {
    setForm(f => ({ ...f, conditions: f.conditions.filter(c => c.id !== id) }));
  }

  const canSave = form.name.trim() && form.message.trim() && form.conditions.every(c => c.value.trim());

  const inp = (style?: React.CSSProperties): React.CSSProperties => ({
    width: '100%', padding: '8px 10px', borderRadius: 6,
    border: '1px solid var(--line)', background: 'var(--bg)',
    fontSize: 13, color: 'var(--text)', fontFamily: 'inherit', outline: 'none',
    boxSizing: 'border-box', ...style,
  });

  return (
    <div style={{
      background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 12,
      padding: '24px 24px 20px', display: 'flex', flexDirection: 'column', gap: 18,
    }}>
      <div className="page-title" style={{ fontSize: 22 }}>
        {form.id ? 'Edit alarm' : 'New alarm'}
      </div>

      {/* Name */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text4)', fontFamily: "'Barlow Condensed', sans-serif" }}>Alarm name</label>
        <input value={form.name} onChange={e => setField('name', e.target.value)} placeholder="e.g. Diff ON at speed" style={inp()} />
      </div>

      {/* Type */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text4)', fontFamily: "'Barlow Condensed', sans-serif" }}>Type</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['positive', 'negative', 'neutral'] as AlarmType[]).map(t => {
            const c = TYPE_CONFIG[t];
            const on = form.type === t;
            return (
              <button key={t} onClick={() => setField('type', t)} style={{
                flex: 1, height: 34, borderRadius: 6, border: `1.5px solid ${on ? c.accent : 'var(--line)'}`,
                background: on ? `${c.accent}18` : 'transparent',
                cursor: 'pointer', fontSize: 12, fontWeight: 600,
                color: on ? c.accent : 'var(--text3)', fontFamily: 'inherit',
                transition: 'all 0.12s',
              }}>{c.label}</button>
            );
          })}
        </div>
      </div>

      {/* Message */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text4)', fontFamily: "'Barlow Condensed', sans-serif" }}>Message shown on screen</label>
        <input value={form.message} onChange={e => setField('message', e.target.value)} placeholder="e.g. Activate diff now — speed above 25" style={inp()} />
        <span style={{ fontSize: 11, color: 'var(--text4)' }}>Keep it short and action-oriented. This is what Rasmus sees.</span>
      </div>

      {/* Conditions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text4)', fontFamily: "'Barlow Condensed', sans-serif" }}>Conditions</label>
          {form.conditions.length > 1 && (
            <div style={{ display: 'flex', gap: 4 }}>
              {(['AND', 'OR'] as const).map(l => (
                <button key={l} onClick={() => setField('logic', l)} style={{
                  height: 22, padding: '0 8px', borderRadius: 4,
                  border: `1px solid ${form.logic === l ? 'var(--green)' : 'var(--line)'}`,
                  background: form.logic === l ? 'var(--gg)' : 'transparent',
                  fontSize: 10, fontWeight: 700, cursor: 'pointer',
                  color: form.logic === l ? 'var(--green)' : 'var(--text4)',
                  fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.1em',
                }}>{l}</button>
              ))}
            </div>
          )}
        </div>

        {form.conditions.map((cond, i) => (
          <div key={cond.id} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {i > 0 && (
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, color: 'var(--text4)', width: 28, flexShrink: 0 }}>{form.logic}</span>
            )}
            {i === 0 && <div style={{ width: 28, flexShrink: 0 }} />}

            <select value={cond.dataPoint} onChange={e => updateCond(cond.id, { dataPoint: e.target.value })} style={{ ...inp(), flex: 2 }}>
              {DATA_POINTS.map(dp => <option key={dp} value={dp}>{dp}</option>)}
            </select>

            <select value={cond.comparator} onChange={e => updateCond(cond.id, { comparator: e.target.value as Comparator })} style={{ ...inp(), flex: 1, minWidth: 60 }}>
              {COMPARATORS.map(c => <option key={c.value} value={c.value}>{c.value}</option>)}
            </select>

            <input value={cond.value} onChange={e => updateCond(cond.id, { value: e.target.value })}
              placeholder="value" style={{ ...inp(), flex: 1 }} />

            {form.conditions.length > 1 && (
              <button onClick={() => removeCond(cond.id)} style={{
                width: 26, height: 26, borderRadius: 5, border: '1px solid var(--line)',
                background: 'transparent', cursor: 'pointer', color: 'var(--text4)',
                flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
              }}>×</button>
            )}
          </div>
        ))}

        <button onClick={addCond} style={{
          height: 30, borderRadius: 6, border: '1px dashed var(--line2)',
          background: 'transparent', cursor: 'pointer', fontSize: 12,
          color: 'var(--text4)', fontFamily: 'inherit', width: '100%',
        }}>+ Add condition</button>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
        <button onClick={onCancel} style={{
          flex: 1, height: 36, borderRadius: 7, border: '1px solid var(--line)',
          background: 'transparent', cursor: 'pointer', fontSize: 13,
          color: 'var(--text3)', fontFamily: 'inherit',
        }}>Cancel</button>
        <button onClick={() => canSave && onSave(form)} disabled={!canSave} style={{
          flex: 2, height: 36, borderRadius: 7, border: 'none',
          background: canSave ? 'var(--green)' : 'var(--line2)',
          cursor: canSave ? 'pointer' : 'default',
          fontSize: 13, fontWeight: 600, color: '#fff', fontFamily: 'inherit',
          transition: 'background 0.15s',
        }}>Save alarm</button>
      </div>
    </div>
  );
}

// ── Main screen ───────────────────────────────────────────────

export default function Alarms() {
  const [alarms, setAlarms] = useState<AlarmDef[]>([]);
  const [building, setBuilding] = useState(false);
  const [editing, setEditing] = useState<AlarmDef | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setAlarms(JSON.parse(raw));
    } catch {}
  }, []);

  function persist(next: AlarmDef[]) {
    setAlarms(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  function handleSave(form: Omit<AlarmDef, 'id'> & { id?: string }) {
    if (form.id) {
      persist(alarms.map(a => a.id === form.id ? { ...form, id: form.id } as AlarmDef : a));
    } else {
      persist([...alarms, { ...form, id: crypto.randomUUID() } as AlarmDef]);
    }
    setBuilding(false);
    setEditing(null);
  }

  function handleDelete(id: string) {
    persist(alarms.filter(a => a.id !== id));
  }

  function handleToggle(id: string) {
    persist(alarms.map(a => a.id === id ? { ...a, enabled: !a.enabled } : a));
  }

  const showBuilder = building || !!editing;

  return (
    <div className="main" style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '20px 24px 0', flexShrink: 0 }}>
        <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>
          Performance · Live
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div className="page-title" style={{ flex: 1 }}>Alarms</div>
          {!showBuilder && (
            <button onClick={() => setBuilding(true)} style={{
              height: 34, padding: '0 14px', borderRadius: 7,
              border: 'none', background: 'var(--green)',
              fontSize: 12, fontWeight: 600, color: '#fff',
              cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              New alarm
            </button>
          )}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px 24px', display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Builder */}
        {showBuilder && (
          <AlarmBuilder
            initial={editing ?? undefined}
            onSave={handleSave}
            onCancel={() => { setBuilding(false); setEditing(null); }}
          />
        )}

        {/* List */}
        {alarms.length === 0 && !showBuilder ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text4)' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4, marginBottom: 12 }}>
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            <div style={{ fontSize: 14, fontWeight: 500 }}>No alarms yet</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>Create one to get live feedback during racing</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {alarms.map(alarm => (
              <AlarmCard
                key={alarm.id}
                alarm={alarm}
                onEdit={() => { setEditing(alarm); setBuilding(false); }}
                onDelete={() => handleDelete(alarm.id)}
                onToggle={() => handleToggle(alarm.id)}
              />
            ))}
          </div>
        )}

        {/* Info box */}
        {alarms.length > 0 && !showBuilder && (
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--line)', borderRadius: 8, padding: '12px 16px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text4)', fontFamily: "'Barlow Condensed', sans-serif", marginBottom: 6 }}>How it works</div>
            <div style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.6 }}>
              Alarms appear in full-screen on Live Mode when conditions are met. Viktor's alarm service checks these and pushes them in real time.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
