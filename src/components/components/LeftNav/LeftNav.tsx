'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useRole } from '@/context/RoleContext';
import { useUser } from '@clerk/nextjs';
import type { ScreenId } from '@/types';
import { IconCalendar, IconMic, IconAgenda, IconDebrief, IconBook } from '@/components/Icons';

const NAV_ITEMS: { id: ScreenId; title: string; icon: React.ReactElement }[] = [
  { id: 'backbone', title: 'Day Backbone',   icon: <IconCalendar /> },
  { id: 'capture',  title: 'Capture',        icon: <IconMic /> },
  { id: 'intel',    title: 'Debrief Agenda', icon: <IconAgenda /> },
  { id: 'debrief',  title: 'Team Debrief',   icon: <IconDebrief /> },
];

export default function LeftNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { canAccess } = useRole();
  const { user } = useUser();

  const activeScreen = (pathname.replace('/', '') as ScreenId) || 'backbone';
  const imgUrl = user?.imageUrl;
  const initial = user?.firstName?.[0]?.toUpperCase() ?? '?';

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
            onClick={() => accessible && router.push('/' + item.id)}
          >
            {item.icon}
          </div>
        );
      })}

      <div className="ii disabled" title="Memory">
        <IconBook />
      </div>

      <div className="isp" />
      <div className="iava" title={user?.firstName ?? 'You'}>
        {imgUrl ? (
          <img src={imgUrl} alt={initial} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
        ) : (
          initial
        )}
      </div>
    </nav>
  );
}
