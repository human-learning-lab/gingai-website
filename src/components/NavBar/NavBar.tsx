'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useClerk, useUser } from '@clerk/nextjs';
import { useState, useRef, useEffect } from 'react';
import { useRole } from '@/context/RoleContext';
import type { ScreenId } from '@/types';
import { IconCalendar, IconMic, IconDebrief, IconTranscript } from '@/components/Icons';

const NAV_ITEMS: { id: ScreenId; label: string; icon: React.ReactElement }[] = [
  { id: 'backbone',    label: 'Schedule',    icon: <IconCalendar size={13} /> },
  { id: 'capture',     label: 'Capture',     icon: <IconMic size={13} /> },
  { id: 'debrief',     label: 'Debrief',     icon: <IconDebrief size={13} /> },
  { id: 'transcripts', label: 'Transcripts', icon: <IconTranscript size={13} /> },
];

function UserChip() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const { role } = useRole();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  if (!user) return null;

  const name = user.firstName ?? user.emailAddresses[0]?.emailAddress?.split('@')[0] ?? 'You';
  const imgUrl = user.imageUrl;
  const roleLabel = role?.label ?? 'Team Member';

  return (
    <div className="role-switcher" ref={ref}>
      <button className="role-switcher-btn" onClick={() => setOpen(v => !v)}>
        {imgUrl ? (
          <img src={imgUrl} alt={name} style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0, objectFit: 'cover' }} />
        ) : (
          <div className="rp-ava">{name[0]?.toUpperCase()}</div>
        )}
        <span className="rp-label">
          <span className="rp-name">{name}</span>
          <span className="rp-role">{roleLabel}</span>
        </span>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ flexShrink: 0 }}>
          <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="role-dropdown">
          <div className="rdg-label">Signed in as</div>
          <div className="role-dropdown-item" style={{ cursor: 'default', gap: 10 }}>
            {imgUrl ? (
              <img src={imgUrl} alt={name} style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0, objectFit: 'cover' }} />
            ) : (
              <div className="rp-ava" style={{ width: 30, height: 30, fontSize: 12 }}>{name[0]?.toUpperCase()}</div>
            )}
            <span>
              <span className="rp-name" style={{ fontSize: 13 }}>{name}</span>
              <span className="rp-role" style={{ display: 'block', fontSize: 11 }}>{user.emailAddresses[0]?.emailAddress}</span>
            </span>
          </div>
          <div className="rdg-divider" />
          <div
            className="role-dropdown-item"
            onClick={() => signOut({ redirectUrl: '/sign-in' })}
            style={{ color: 'var(--red)' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            <span style={{ fontSize: 13, fontWeight: 500 }}>Sign out</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { canAccess } = useRole();

  const activeScreen = (pathname.replace('/', '') as ScreenId) || 'backbone';

  function handleNav(id: ScreenId) {
    if (canAccess(id)) router.push('/' + id);
  }

  return (
    <div id="pbar">
      <img src="/images/logo/team_logo.png" alt="Team logo" className="pb-logo" style={{ width: 36, height: 36, objectFit: 'contain' }} />
      <div className="pb-sep" />

      {NAV_ITEMS.map(item => (
        <button
          key={item.id}
          className={`sb${activeScreen === item.id ? ' on' : ''}${!canAccess(item.id) ? ' disabled' : ''}`}
          onClick={() => handleNav(item.id)}
        >
          {item.icon}
          {item.label}
        </button>
      ))}

      <div className="pb-sep" style={{ marginLeft: 8 }} />
      <UserChip />

      <div className="pb-sp" />
      <div className="pb-tag">Mubadala Brazil SailGP · GingAI · 2026</div>
    </div>
  );
}
