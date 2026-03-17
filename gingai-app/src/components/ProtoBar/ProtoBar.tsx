import type { ReactElement } from 'react';
import { useRole, ROLES } from '../../context/RoleContext';
import type { ScreenId } from '../../types';
import { IconCalendar, IconMic, IconZap, IconChat } from '../Icons';

interface Props {
  activeScreen: ScreenId;
  onNavigate: (s: ScreenId) => void;
}

const NAV_ITEMS: { id: ScreenId; label: string; icon: ReactElement }[] = [
  { id: 'backbone', label: 'Day Backbone', icon: <IconCalendar size={13} /> },
  { id: 'capture',  label: 'Capture',      icon: <IconMic size={13} /> },
  { id: 'intel',    label: 'Debrief Agenda', icon: <IconZap size={13} /> },
  { id: 'debrief',  label: 'Team Debrief', icon: <IconChat size={13} /> },
];

export default function ProtoBar({ activeScreen, onNavigate }: Props) {
  const { role, setRole, canAccess } = useRole();

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

      {/* Role switcher */}
      <div className="role-pills">
        {ROLES.map(r => (
          <button
            key={r.id}
            className={`role-pill${role.id === r.id ? ' active' : ''}`}
            onClick={() => {
              setRole(r);
              if (!r.screens.includes(activeScreen)) {
                onNavigate(r.screens[0] as ScreenId);
              }
            }}
          >
            <span className="rp-ava">{r.initial}</span>
            <span className="rp-label">
              <span className="rp-name">{r.name}</span>
              <span className="rp-role">{r.label}</span>
            </span>
          </button>
        ))}
      </div>

      <div className="pb-sp" />
      <div className="pb-tag">Mubadala Brazil SailGP · GingAI · Mar 2026</div>
    </div>
  );
}
