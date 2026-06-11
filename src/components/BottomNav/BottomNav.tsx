'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useRole } from '@/context/RoleContext';
import { useTutorial } from '@/context/TutorialContext';
import { useState } from 'react';
import type { ScreenId } from '@/types';
import { IconCalendar, IconMic, IconSim, IconDebrief, IconTranscript, IconFolder, IconHelp, IconBell } from '@/components/Icons';

const PRIMARY_ITEMS: { id: ScreenId; label: string; icon: React.ReactElement }[] = [
  { id: 'backbone', label: 'Race',    icon: <IconCalendar size={22} /> },
  { id: 'sim',      label: 'Sim',     icon: <IconSim size={22} /> },
  { id: 'capture',  label: 'Capture', icon: <IconMic size={22} /> },
];

const MORE_ITEMS: { id: ScreenId; label: string; icon: React.ReactElement }[] = [
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
  const [sheetOpen, setSheetOpen] = useState(false);

  const activeScreen = (pathname.replace('/', '') as ScreenId) || 'backbone';
  const moreActive = MORE_ITEMS.some(i => i.id === activeScreen);

  function nav(id: ScreenId) {
    if (canAccess(id)) { router.push('/' + id); setSheetOpen(false); }
  }

  return (
    <>
      {/* Bottom sheet overlay */}
      {sheetOpen && (
        <>
          <div
            onClick={() => setSheetOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 99 }}
          />
          <div style={{
            position: 'fixed', bottom: 64, left: 0, right: 0, zIndex: 100,
            background: 'var(--bg)', borderTop: '1px solid var(--line)',
            borderRadius: '16px 16px 0 0', padding: '12px 0 8px',
          }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--line)', margin: '0 auto 16px' }} />
            {MORE_ITEMS.map(item => {
              const accessible = canAccess(item.id);
              const active = activeScreen === item.id;
              return (
                <div
                  key={item.id}
                  onClick={() => nav(item.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '13px 24px',
                    color: active ? 'var(--green)' : accessible ? 'var(--text)' : 'var(--text4)',
                    opacity: accessible ? 1 : 0.4,
                    cursor: accessible ? 'pointer' : 'default',
                    fontWeight: active ? 700 : 500,
                    fontSize: 15,
                  }}
                >
                  {item.icon}
                  {item.label}
                </div>
              );
            })}
            <div style={{ height: 1, background: 'var(--line)', margin: '8px 0' }} />
            <div
              onClick={() => { openTutorial(); setSheetOpen(false); }}
              style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 24px', color: 'var(--text)', cursor: 'pointer', fontSize: 15, fontWeight: 500 }}
            >
              <IconHelp size={22} />
              Tutorial
            </div>
          </div>
        </>
      )}

      <nav className="bottom-nav">
        {PRIMARY_ITEMS.map(item => {
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

        {/* More */}
        <div
          className={`bn-item${moreActive || sheetOpen ? ' on' : ''}`}
          onClick={() => setSheetOpen(v => !v)}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>
          </svg>
          <span className="bn-label">More</span>
        </div>
      </nav>
    </>
  );
}
