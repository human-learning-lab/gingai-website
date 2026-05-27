'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'gingai_tutorial_seen';

interface TutorialContextValue {
  openTutorial: () => void;
}

const TutorialContext = createContext<TutorialContextValue>({ openTutorial: () => {} });

export function useTutorial() {
  return useContext(TutorialContext);
}

interface TutorialProviderProps {
  children: React.ReactNode;
  /** Receives open state so the parent can render the modal */
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export function TutorialProvider({ children, isOpen: _isOpen, setIsOpen }: TutorialProviderProps) {
  const openTutorial = useCallback(() => setIsOpen(true), [setIsOpen]);
  return (
    <TutorialContext.Provider value={{ openTutorial }}>
      {children}
    </TutorialContext.Provider>
  );
}

/** Hook to use in ProtectedShell to manage modal state + first-visit auto-open */
export function useTutorialState() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!localStorage.getItem(STORAGE_KEY)) {
      setIsOpen(true);
    }
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, '1');
    }
  }, []);

  return { isOpen, setIsOpen, handleClose };
}
