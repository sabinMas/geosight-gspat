"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface RightPanelContextType {
  rightPanelOpen: boolean;
  setRightPanelOpen: (open: boolean) => void;
}

const RightPanelContext = createContext<RightPanelContextType | undefined>(undefined);

export function RightPanelProvider({ children }: { children: ReactNode }) {
  const [rightPanelOpen, setRightPanelOpen] = useState(false);

  const handleSetRightPanelOpen = useCallback((open: boolean) => {
    setRightPanelOpen(open);
  }, []);

  return (
    <RightPanelContext.Provider value={{ rightPanelOpen, setRightPanelOpen: handleSetRightPanelOpen }}>
      {children}
    </RightPanelContext.Provider>
  );
}

export function useRightPanel() {
  const context = useContext(RightPanelContext);
  if (context === undefined) {
    return { rightPanelOpen: false, setRightPanelOpen: () => {} };
  }
  return context;
}
