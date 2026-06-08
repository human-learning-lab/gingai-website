'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useRole } from '@/context/RoleContext';
import { useTutorial } from '@/context/TutorialContext';
import type { ScreenId } from '@/types';
import { IconCalendar, IconMic, IconDebrief, IconTranscript, IconFolder, IconHelp, IconBell } from '@/components/Icons';

const NAV_ITEMS: { id: ScreenId; label: string; icon: React.ReactElement }[] = [
  { id: 'backbone',    label: 'Schedule',    icon: <IconCalendar size={22} /> },
  { id: 'capture',     label: 'Capture',     icon: <IconMic size={22} /> },
  { id: 'debrief',     label: 'Debrief',     icon: <IconDebrief size={22} /> },
  { id: 'transcripts', label: 'Transcripts', icon: <IconTranscript size={22} /> },
  { id: 'library',     label: 'Library',     icon: <IconFolder size={22} /> },
  { id: 'alarms',      label: 'Alarms',      icon: <IconBell size={22} /> },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { canAccess } = useRole();
  const { openTutorial } = useTutorial();

  const activeScreen = (pathname.replace('/', '') as ScreenId) || 'backbone';

  return (
    <nav className="bottom-nav">
      {NAV_ITEMS.map(item => {
        const accessible = canAccess(item.id);
        return (
          <div
            key={item.id}
            data-tutorial-id={item.id}
            className={`bn-item${activeScreen === item.id ? ' on' : ''}${!accessible ? ' disabled' : ''}`}
            onClick={() => accessible && router.push('/' + item.id)}
          >
            {item.icon}
            <span className="bn-label">{item.label}</span>
          </div>
        );
      })}
      <div className="bn-item" onClick={openTutorial}>
        <IconHelp size={22} />
        <span className="bn-label">Tutorial</span>
      </div>
    </nav>
  );
}
