'use client';

import { createContext, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';
import { useUser } from '@clerk/nextjs';
import type { Role, ScreenId } from '@/types';
import { ROLES } from '@/data/roles';

const ALL_SCREENS: ScreenId[] = ['backbone', 'capture', 'intel', 'debrief'];

interface RoleContextValue {
  role: Role | null;
  isLoaded: boolean;
  canAccess: (screen: ScreenId) => boolean;
}

const RoleContext = createContext<RoleContextValue | null>(null);

export function RoleProvider({ children }: { children: ReactNode }) {
  const { user, isLoaded } = useUser();

  const role = useMemo<Role | null>(() => {
    if (!isLoaded || !user) return null;
    const roleId = (user.publicMetadata as { roleId?: string }).roleId;
    if (!roleId) return null;
    return ROLES.find(r => r.id === roleId) ?? null;
  }, [user, isLoaded]);

  function canAccess(screen: ScreenId): boolean {
    if (!role) return false;
    if (role.view === 'developer') return true;
    return role.screens.includes(screen);
  }

  return (
    <RoleContext.Provider value={{ role, isLoaded, canAccess }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error('useRole must be used inside RoleProvider');
  return ctx;
}

export { ROLES, ALL_SCREENS };
