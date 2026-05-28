'use client';

import { useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RoleProvider } from '@/context/RoleContext';
import { TutorialProvider, useTutorialState } from '@/context/TutorialContext';
import NavBar from '@/components/NavBar/NavBar';
import LeftNav from '@/components/LeftNav/LeftNav';
import BottomNav from '@/components/BottomNav/BottomNav';
import TutorialModal from '@/components/Tutorial/TutorialModal';
import { ROLES } from '@/data/roles';

export default function ProtectedShell({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const { isOpen, setIsOpen, handleClose } = useTutorialState();

  // Always reload on mount to get fresh publicMetadata from Clerk
  useEffect(() => {
    if (!isLoaded || !user) return;
    user.reload();
  }, [isLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isLoaded || !user) return;

    const roleId = (user.publicMetadata as { roleId?: string }).roleId;
    const isKnown = roleId && ROLES.some(r => r.id === roleId);

    if (!isKnown) {
      // Try to auto-assign a role based on email
      fetch('/api/assign-role', { method: 'POST' })
        .then(res => res.ok ? user.reload() : Promise.reject())
        .catch(() => router.replace('/pending'));
    }
  }, [user, isLoaded, router]);

  if (!isLoaded) {
    return (
      <div style={{
        height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg)',
      }}>
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 28, fontWeight: 800, color: 'var(--text4)',
          letterSpacing: '0.04em',
        }}>
          Ging<span style={{ color: 'var(--green)' }}>AI</span>
        </div>
      </div>
    );
  }

  return (
    <RoleProvider>
      <TutorialProvider isOpen={isOpen} setIsOpen={setIsOpen}>
        <NavBar />
        <div className="app-body">
          <LeftNav />
          <div className="screen-wrap">
            {children}
          </div>
        </div>
        <BottomNav />
        {isOpen && <TutorialModal onClose={handleClose} />}
      </TutorialProvider>
    </RoleProvider>
  );
}
