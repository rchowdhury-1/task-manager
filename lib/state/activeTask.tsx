'use client';
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface ActiveTaskContextValue {
  activeTaskId: string | null;
  setActiveTaskId: (id: string | null) => void;
}

const ActiveTaskContext = createContext<ActiveTaskContextValue>({
  activeTaskId: null,
  setActiveTaskId: () => {},
});

export function ActiveTaskProvider({ children }: { children: ReactNode }) {
  const [activeTaskId, setActiveTaskIdRaw] = useState<string | null>(null);
  const setActiveTaskId = useCallback((id: string | null) => setActiveTaskIdRaw(id), []);

  return (
    <ActiveTaskContext.Provider value={{ activeTaskId, setActiveTaskId }}>
      {children}
    </ActiveTaskContext.Provider>
  );
}

export function useActiveTask() {
  return useContext(ActiveTaskContext);
}
