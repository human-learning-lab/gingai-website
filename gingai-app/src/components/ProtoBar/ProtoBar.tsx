import { useState, useRef, useEffect, type ReactElement } from 'react';
import { useRole, ROLES } from '../../context/RoleContext';
import type { ScreenId, Role } from '../../types';
import { IconCalendar, IconMic, IconZap, IconChat } from '../Icons';

interface Props {
  activeScreen: ScreenId;
  onNavigate: (s: ScreenId) => void;
}

const NAV_ITEMS: { id: ScreenId; label: string; icon: ReactElement }[] = [
  { id: 'backbone', label: 'Day Backbone',   icon: <IconCalendar size={13} /> },
  { id: 'capture',  label: 'Capture',        icon: <IconMic size={13} /> },
  { id: 'intel',    label: 'Debrief Agenda', icon: <IconZap size={13} /> },
  { id: 'debrief',  label: 'Team Debrief',   icon: <IconChat size={13} /> },
];

const SAILOR_ROLES  = ROLES.filter(r => r.view === 'sailor');
const COACHING_ROLES = ROLES.filter(r => r.view !== 'sailor');

function ChevronDown() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ flexShrink: 0 }}>
      <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function RoleSwitcher({ activeScreen, onNavigate }: { activeScreen: ScreenId; onNavigate: (s: ScreenId) => void }) {
  const { role, setRole } = useRole();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function pick(r: Role) {
    setRole(r);
    if (!r.screens.includes(activeScreen)) onNavigate(r.screens[0] as ScreenId);
    setOpen(false);
  }

  return (
    <div className="role-switcher" ref={ref}>
      <button className="role-switcher-btn" onClick={() => setOpen(v => !v)}>
        <span className="rp-ava">{role.initial}</span>
        <span className="rp-label">
          <span className="rp-name">{role.name}</span>
          <span className="rp-role">{role.label}</span>
        </span>
        <ChevronDown />
      </button>

      {open && (
        <div className="role-dropdown">
          <div className="rdg-label">Sailing Crew</div>
          {SAILOR_ROLES.map(r => (
            <div key={r.id} className={`role-dropdown-item${role.id === r.id ? ' active' : ''}`} onClick={() => pick(r)}>
              <span className="rp-ava" style={{ width: 22, height: 22, fontSize: 9 }}>{r.initial}</span>
              <span>
                <span className="rp-name" style={{ fontSize: 13 }}>{r.name}</span>
                <span className="rp-role" style={{ display: 'block', fontSize: 11 }}>{r.label}</span>
              </span>
              {role.id === r.id && <span style={{ marginLeft: 'auto', color: 'var(--green)', fontSize: 12 }}>✓</span>}
            </div>
          ))}
          <div className="rdg-divider" />
          <div className="rdg-label">Coaching & Analysis</div>
          {COACHING_ROLES.map(r => (
            <div key={r.id} className={`role-dropdown-item${role.id === r.id ? ' active' : ''}`} onClick={() => pick(r)}>
              <span className="rp-ava" style={{ width: 22, height: 22, fontSize: 9 }}>{r.initial}</span>
              <span>
                <span className="rp-name" style={{ fontSize: 13 }}>{r.name}</span>
                <span className="rp-role" style={{ display: 'block', fontSize: 11 }}>{r.label}</span>
              </span>
              {role.id === r.id && <span style={{ marginLeft: 'auto', color: 'var(--green)', fontSize: 12 }}>✓</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProtoBar({ activeScreen, onNavigate }: Props) {
  const { role, canAccess } = useRole();

  function handleNav(id: ScreenId) {
    if (canAccess(id)) onNavigate(id);
  }

  return (
    <div id="pbar">
      <div className="pb-logo">Ging<span className="ai">AI</span></div>
      <div className="pb-sep" />

      {NAV_ITEMS.map(item => (
        <button
          key={item.id}
          className={`sb${activeScreen === item.id ? ' on' : ''}${!canAccess(item.id) ? ' disabled' : ''}`}
          onClick={() => handleNav(item.id)}
          style={!canAccess(item.id) ? { opacity: 0.3, cursor: 'not-allowed' } : undefined}
          title={!canAccess(item.id) ? `Not available for ${role.label}` : undefined}
        >
          {item.icon}
          {item.label}
        </button>
      ))}

      <div className="pb-sep" style={{ marginLeft: 8 }} />
      <RoleSwitcher activeScreen={activeScreen} onNavigate={onNavigate} />

      <div className="pb-sp" />
      <div className="pb-tag">Mubadala Brazil SailGP · GingAI · 2026</div>
    </div>
  );
}
