import { useState } from 'react';

interface CheckItem {
  id: string;
  label: string;
  checked: boolean;
}

const INITIAL_ITEMS: CheckItem[] = [
  { id: 'sunscreen', label: 'Sunscreen',    checked: false },
  { id: 'goggles',   label: 'Goggles',      checked: false },
  { id: 'tablet',    label: 'Tablet',        checked: false },
  { id: 'shackle',   label: 'Soft shackle',  checked: false },
  { id: 'gloves',    label: 'Gloves',        checked: false },
  { id: 'radio',     label: 'Team radio',    checked: false },
];

interface AiChip {
  id: string;
  text: string;
  dismissed: boolean;
}

const INITIAL_CHIPS: AiChip[] = [
  { id: 'uv',   text: '☀️ UV index is high today — don\'t forget sunscreen', dismissed: false },
  { id: 'wind', text: '💨 Wind forecast 18–22 kn — check glove fit',          dismissed: false },
];

export default function Block1550() {
  const [items, setItems]     = useState<CheckItem[]>(INITIAL_ITEMS);
  const [chips, setChips]     = useState<AiChip[]>(INITIAL_CHIPS);
  const [newLabel, setNewLabel] = useState('');

  function toggle(id: string) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, checked: !i.checked } : i));
  }

  function dismiss(id: string) {
    setChips(prev => prev.map(c => c.id === id ? { ...c, dismissed: true } : c));
  }

  function addItem() {
    const label = newLabel.trim();
    if (!label) return;
    setItems(prev => [...prev, { id: `custom-${Date.now()}`, label, checked: false }]);
    setNewLabel('');
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter') addItem();
  }

  const done  = items.filter(i => i.checked).length;
  const total = items.length;

  return (
    <div style={{ padding: '20px 24px', maxWidth: 420 }}>
      <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 16 }}>
        15:50 — Transfer to Boat
      </div>
      <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 800 }}>Gear Checklist</h2>
      <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--text2)' }}>
        {done}/{total} packed
      </p>

      {/* AI context chips */}
      {chips.filter(c => !c.dismissed).length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          {chips.filter(c => !c.dismissed).map(chip => (
            <div key={chip.id} className="transfer-chip">
              <span>{chip.text}</span>
              <button className="transfer-chip-dismiss" onClick={() => dismiss(chip.id)} aria-label="Dismiss">×</button>
            </div>
          ))}
        </div>
      )}

      {/* Checklist */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 20 }}>
        {items.map(item => (
          <button
            key={item.id}
            className={`transfer-row${item.checked ? ' checked' : ''}`}
            onClick={() => toggle(item.id)}
          >
            <div className={`transfer-check${item.checked ? ' on' : ''}`}>
              {item.checked && (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="2 6 5 9 10 3" />
                </svg>
              )}
            </div>
            <span className="transfer-label">{item.label}</span>
          </button>
        ))}
      </div>

      {/* Add item */}
      <div className="transfer-add">
        <input
          type="text"
          placeholder="+ Add item"
          value={newLabel}
          onChange={e => setNewLabel(e.target.value)}
          onKeyDown={handleKey}
        />
        {newLabel.trim() && (
          <button onClick={addItem}>Add</button>
        )}
      </div>
    </div>
  );
}
