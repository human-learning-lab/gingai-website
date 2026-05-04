import { useEffect } from 'react';
import type { ReactNode } from 'react';

export function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    document.documentElement.removeAttribute('data-theme');
  }, []);

  return <>{children}</>;
}

/** Kept for backward-compat — theme is always light; setTheme is a no-op */
export function useTheme() {
  return { theme: 'light' as const, setTheme: (_: string) => {} };
}
