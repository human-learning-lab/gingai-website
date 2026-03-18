import type { ReactElement } from 'react';
import { useRole } from '../../context/RoleContext';
import type { ScreenId } from '../../types';
import { IconCalendar, IconMic, IconZap, IconChat, IconBook } from '../Icons';
import Avatar from '../Avatar';

interface Props {
  activeScreen: ScreenId;
  onNavigate: (s: ScreenId) => void;
}

const NAV_ITEMS: { id: ScreenId; title: string; icon: ReactElement }[] = [
  { id: 'backbone', title: 'Day Backbone', icon: <IconCalendar /> },
  { id: 'capture',  title: 'Capture',      icon: <IconMic /> },
  { id: 'intel',    title: 'Intelligence', icon: <IconZap /> },
  { id: 'debrief',  title: 'Team Debrief', icon: <IconChat /> },
];

export default function LeftNav({ activeScreen, onNavigate }: Props) {
  const { role, canAccess } = useRole();

  return (
    <nav className="inav">
      <div className="ilogo">G</div>

      {NAV_ITEMS.map(item => {
        const accessible = canAccess(item.id);
        return (
          <div
            key={item.id}
            className={`ii${activeScreen === item.id ? ' on' : ''}${!accessible ? ' disabled' : ''}`}
            title={item.title}
            onClick={() => accessible && onNavigate(item.id)}
          >
            {item.icon}
          </div>
        );
      })}

      <div
        className="ii disabled"
        title="Memory"
      >
        <IconBook />
      </div>

      <div className="isp" />
      <div title={`${role.name} · ${role.label}`}>
        <Avatar
          src={role.avatar}
          initial={role.initial}
          size={30}
          style={{ border: '1.5px solid var(--gb)' }}
        />
      </div>
    </nav>
  );
}
