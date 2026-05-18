'use client';

import { useUser } from '@clerk/nextjs';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RoleProvider } from '@/context/RoleContext';
import NavBar from '@/components/NavBar/NavBar';
import BottomNav from '@/components/BottomNav/BottomNav';
import { ROLES } from '@/data/roles';

export default function ProtectedShell({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;
    if (!user) return;

    const roleId = (user.publicMetadata as { roleId?: string }).roleId;
    if (!roleId) {
      router.replace('/pending');
      return;
    }

    const isKnown = ROLES.some(r => r.id === roleId);
    if (!isKnown) {
      router.replace('/pending');
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
      <NavBar />
      <div className="screen-wrap">
        {children}
      </div>
      <BottomNav />
    </RoleProvider>
  );
}
