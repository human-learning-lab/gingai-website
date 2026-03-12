import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { Role, ScreenId } from '../types';
import { ROLES, DEFAULT_ROLE } from '../data/roles';

interface RoleContextValue {
  role: Role;
  setRole: (r: Role) => void;
  canAccess: (screen: ScreenId) => boolean;
}

const RoleContext = createContext<RoleContextValue | null>(null);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>(DEFAULT_ROLE);

  function canAccess(screen: ScreenId) {
    return role.screens.includes(screen);
  }

  return (
    <RoleContext.Provider value={{ role, setRole, canAccess }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error('useRole must be used inside RoleProvider');
  return ctx;
}

export { ROLES };
