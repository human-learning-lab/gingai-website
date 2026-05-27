'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useRole } from '@/context/RoleContext';
import { useUser, useClerk } from '@clerk/nextjs';
import { useState, useRef, useEffect } from 'react';
import type { ScreenId } from '@/types';
import { IconCalendar, IconMic, IconDebrief, IconTranscript, IconHelp } from '@/components/Icons';
import { useTutorial } from '@/context/TutorialContext';

const NAV_ITEMS: { id: ScreenId; title: string; icon: React.ReactElement }[] = [
  { id: 'backbone',    title: 'Schedule',    icon: <IconCalendar /> },
  { id: 'capture',     title: 'Capture',     icon: <IconMic /> },
  { id: 'debrief',     title: 'Debrief',     icon: <IconDebrief /> },
  { id: 'transcripts', title: 'Transcripts', icon: <IconTranscript /> },
];

export default function LeftNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { canAccess } = useRole();
  const { user } = useUser();
  const { signOut } = useClerk();
  const { openTutorial } = useTutorial();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const activeScreen = (pathname.replace('/', '') as ScreenId) || 'backbone';
  const imgUrl = user?.imageUrl;
  const initial = user?.firstName?.[0]?.toUpperCase() ?? '?';
  const name = user?.firstName ?? user?.emailAddresses[0]?.emailAddress?.split('@')[0] ?? 'You';

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <nav className="inav">
      <div className="ilogo">
        <img src="/images/logo/team_logo.png" alt="Team logo" />
      </div>

      {NAV_ITEMS.map(item => {
        const accessible = canAccess(item.id);
        return (
          <div
            key={item.id}
            data-tutorial-id={item.id}
            className={`ii${activeScreen === item.id ? ' on' : ''}${!accessible ? ' disabled' : ''}`}
            onClick={() => accessible && router.push('/' + item.id)}
          >
            {item.icon}
            {item.title}
          </div>
        );
      })}

      <div className="isp" />

      <div className="ii" onClick={openTutorial}>
        <IconHelp />
        Tutorial
      </div>

      <div className="inav-ava-wrap" ref={menuRef}>
        <div className="inav-user" onClick={() => setMenuOpen(v => !v)}>
          <div className="iava">
            {imgUrl ? (
              <img src={imgUrl} alt={initial} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              initial
            )}
          </div>
          <span className="inav-user-name">{name}</span>
        </div>
        {menuOpen && (
          <div className="inav-menu">
            <div className="inav-menu-name">{name}</div>
            <div className="inav-menu-email">{user?.emailAddresses[0]?.emailAddress}</div>
            <div className="inav-menu-divider" />
            <button className="inav-menu-signout" onClick={() => signOut({ redirectUrl: '/sign-in' })}>
              Sign out
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
