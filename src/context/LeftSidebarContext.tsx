"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface LeftSidebarContextType {
  desktopSidebarOpen: boolean;
  setDesktopSidebarOpen: (open: boolean) => void;
}

const LeftSidebarContext = createContext<LeftSidebarContextType | undefined>(undefined);

export function LeftSidebarProvider({ children }: { children: ReactNode }) {
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);

  const handleSetDesktopSidebarOpen = useCallback((open: boolean) => {
    setDesktopSidebarOpen(open);
  }, []);

  return (
    <LeftSidebarContext.Provider value={{ desktopSidebarOpen, setDesktopSidebarOpen: handleSetDesktopSidebarOpen }}>
      {children}
    </LeftSidebarContext.Provider>
  );
}

export function useLeftSidebar() {
  const context = useContext(LeftSidebarContext);
  if (context === undefined) {
    return { desktopSidebarOpen: true, setDesktopSidebarOpen: () => {} };
  }
  return context;
}
