'use client';

import { useState } from 'react';

export interface TransferBlockData {
  items?: string[];
  notes?: string;
}

interface Props { data?: TransferBlockData | null }

export default function Block1550({ data }: Props) {
  const seedItems = data?.items ?? [];
  const [checked, setChecked] = useState<Set<number>>(() => new Set());
  const [custom, setCustom] = useState('');
  const [extras, setExtras] = useState<string[]>([]);

  const all = [...seedItems, ...extras];
  const done = all.filter((_, i) => checked.has(i)).length;

  function toggle(i: number) {
    setChecked(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  }

  function addItem() {
    const label = custom.trim();
    if (!label) return;
    setExtras(prev => [...prev, label]);
    setCustom('');
  }

  return (
    <>
      <div className="main-top">
        <div className="eyebrow">15:50 · Transfer to Yacht</div>
        <div className="page-title">Gear Checklist</div>
      </div>
      <div className="gen-panel">
        {all.length === 0 ? (
          <>
            <div style={{ fontSize: 13, color: 'var(--text4)', lineHeight: 1.7, marginBottom: 20 }}>
              Gear list will be configured before departure.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                value={custom}
                onChange={e => setCustom(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addItem()}
                placeholder="Add item…"
                style={{
                  flex: 1, height: 36, padding: '0 12px',
                  border: '1.5px solid var(--line)', borderRadius: 6,
                  background: 'var(--bg)', color: 'var(--text)',
                  fontSize: 13, fontFamily: 'inherit', outline: 'none',
                }}
              />
              {custom.trim() && (
                <button
                  onClick={addItem}
                  style={{
                    height: 36, padding: '0 14px', borderRadius: 6,
                    border: '1px solid var(--line)', background: 'var(--bg2)',
                    fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
                    color: 'var(--text2)',
                  }}
                >Add</button>
              )}
            </div>
          </>
        ) : (
          <>
            {data?.notes && (
              <div style={{ fontSize: 13, color: 'var(--text3)', lineHeight: 1.6, marginBottom: 16 }}>{data.notes}</div>
            )}
            <div style={{ fontSize: 12, color: 'var(--text4)', marginBottom: 12 }}>{done}/{all.length} packed</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 16 }}>
              {all.map((item, i) => (
                <button
                  key={i}
                  onClick={() => toggle(i)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 0', background: 'none', border: 'none',
                    borderBottom: i < all.length - 1 ? '1px solid var(--line)' : 'none',
                    cursor: 'pointer', textAlign: 'left', width: '100%',
                  }}
                >
                  <div style={{
                    width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                    border: checked.has(i) ? '1.5px solid var(--green)' : '1.5px solid var(--line2)',
                    background: checked.has(i) ? 'var(--green)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {checked.has(i) && (
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="2 5 4 7 8 3" />
                      </svg>
                    )}
                  </div>
                  <span style={{
                    fontSize: 14, color: checked.has(i) ? 'var(--text4)' : 'var(--text)',
                    textDecoration: checked.has(i) ? 'line-through' : 'none',
                  }}>{item}</span>
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                value={custom}
                onChange={e => setCustom(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addItem()}
                placeholder="Add item…"
                style={{
                  flex: 1, height: 34, padding: '0 10px',
                  border: '1px solid var(--line)', borderRadius: 6,
                  background: 'var(--bg)', color: 'var(--text)',
                  fontSize: 13, fontFamily: 'inherit', outline: 'none',
                }}
              />
              {custom.trim() && (
                <button
                  onClick={addItem}
                  style={{
                    height: 34, padding: '0 12px', borderRadius: 6,
                    border: '1px solid var(--line)', background: 'var(--bg2)',
                    fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
                    color: 'var(--text2)',
                  }}
                >Add</button>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
