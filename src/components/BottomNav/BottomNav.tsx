import { useRole } from '../../context/RoleContext';
import type { ScreenId } from '../../types';
import { IconCalendar, IconMic, IconAgenda, IconDebrief } from '../Icons';

interface Props {
  activeScreen: ScreenId;
  onNavigate: (s: ScreenId) => void;
}

const NAV_ITEMS: { id: ScreenId; label: string; icon: React.ReactElement }[] = [
  { id: 'backbone', label: 'Schedule', icon: <IconCalendar size={22} /> },
  { id: 'capture',  label: 'Capture',  icon: <IconMic size={22} /> },
  { id: 'intel',    label: 'Agenda',   icon: <IconAgenda size={22} /> },
  { id: 'debrief',  label: 'Debrief',  icon: <IconDebrief size={22} /> },
];

export default function BottomNav({ activeScreen, onNavigate }: Props) {
  const { canAccess } = useRole();

  return (
    <nav className="bottom-nav">
      {NAV_ITEMS.map(item => {
        const accessible = canAccess(item.id);
        return (
          <div
            key={item.id}
            className={`bn-item${activeScreen === item.id ? ' on' : ''}${!accessible ? ' disabled' : ''}`}
            onClick={() => accessible && onNavigate(item.id)}
          >
            {item.icon}
            <span className="bn-label">{item.label}</span>
          </div>
        );
      })}
    </nav>
  );
}
