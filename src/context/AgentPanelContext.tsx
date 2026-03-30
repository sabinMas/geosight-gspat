"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import {
  AgentId,
  GeoSightContext,
  GeoSightUiContext,
  GeoSightViewportClass,
} from "@/lib/agents/agent-config";

type AgentPanelContextValue = {
  activeAgentId: AgentId;
  setActiveAgent: (id: AgentId) => void;
  geoContext: GeoSightContext | null;
  setGeoContext: (ctx: GeoSightContext) => void;
  uiContext: GeoSightUiContext | null;
  setUiContext: (ctx: Partial<GeoSightUiContext>) => void;
};

const AgentPanelContext = createContext<AgentPanelContextValue | null>(null);

export function AgentPanelProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [activeAgentId, setActiveAgent] = useState<AgentId>("geo-analyst");
  const [geoContext, setGeoContext] = useState<GeoSightContext | null>(null);
  const [uiContext, setUiContextState] = useState<GeoSightUiContext | null>(null);

  useEffect(() => {
    function getViewportClass(width: number): GeoSightViewportClass {
      if (width < 768) {
        return "mobile";
      }
      if (width < 1280) {
        return "tablet";
      }
      return "desktop";
    }

    const syncViewport = () => {
      setUiContextState((current) => ({
        ...(current ?? {}),
        currentRoute: pathname,
        viewportClass: getViewportClass(window.innerWidth),
      }));
    };

    syncViewport();
    window.addEventListener("resize", syncViewport);
    return () => window.removeEventListener("resize", syncViewport);
  }, [pathname]);

  const setUiContext = useCallback((ctx: Partial<GeoSightUiContext>) => {
    setUiContextState((current) => ({
      ...(current ?? {}),
      currentRoute: pathname,
      ...ctx,
    }));
  }, [pathname]);

  const value = useMemo(
    () => ({
      activeAgentId,
      setActiveAgent,
      geoContext,
      setGeoContext,
      uiContext,
      setUiContext,
    }),
    [activeAgentId, geoContext, setUiContext, uiContext],
  );

  return (
    <AgentPanelContext.Provider value={value}>
      {children}
    </AgentPanelContext.Provider>
  );
}

export function useAgentPanel() {
  const context = useContext(AgentPanelContext);

  if (!context) {
    throw new Error("useAgentPanel must be used within AgentPanelProvider.");
  }

  return context;
}
