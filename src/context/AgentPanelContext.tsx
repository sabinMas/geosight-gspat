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
  panelOpen: boolean;
  setPanelOpen: (open: boolean) => void;
  geoContext: GeoSightContext | null;
  setGeoContext: (ctx: GeoSightContext) => void;
  uiContext: GeoSightUiContext | null;
  setUiContext: (ctx: Partial<GeoSightUiContext>) => void;
  queuedDrafts: Partial<Record<AgentId, string>>;
  clearQueuedDraft: (agentId: AgentId) => void;
  primeAgent: (agentId: AgentId, draft?: string) => void;
};

const AgentPanelContext = createContext<AgentPanelContextValue | null>(null);

export function AgentPanelProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [panelOpen, setPanelOpenState] = useState(false);
  const [activeAgentId, setActiveAgent] = useState<AgentId>("geo-analyst");
  const [geoContext, setGeoContext] = useState<GeoSightContext | null>(null);
  const [uiContext, setUiContextState] = useState<GeoSightUiContext | null>(null);
  const [queuedDrafts, setQueuedDrafts] = useState<Partial<Record<AgentId, string>>>({});

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const persistedOpen = window.localStorage.getItem("geosight-agent-panel-open");
    if (persistedOpen === "true") {
      setPanelOpenState(true);
    }
  }, []);

  const setPanelOpen = useCallback((open: boolean) => {
    setPanelOpenState(open);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("geosight-agent-panel-open", open ? "true" : "false");
    }
  }, []);

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

  const clearQueuedDraft = useCallback((agentId: AgentId) => {
    setQueuedDrafts((current) => {
      if (!(agentId in current)) {
        return current;
      }

      const nextDrafts = { ...current };
      delete nextDrafts[agentId];
      return nextDrafts;
    });
  }, []);

  const primeAgent = useCallback(
    (agentId: AgentId, draft?: string) => {
      setActiveAgent(agentId);
      setPanelOpen(true);
      if (draft?.trim()) {
        setQueuedDrafts((current) => ({
          ...current,
          [agentId]: draft,
        }));
      }
    },
    [setPanelOpen],
  );

  const value = useMemo(
    () => ({
      activeAgentId,
      setActiveAgent,
      panelOpen,
      setPanelOpen,
      geoContext,
      setGeoContext,
      uiContext,
      setUiContext,
      queuedDrafts,
      clearQueuedDraft,
      primeAgent,
    }),
    [
      activeAgentId,
      clearQueuedDraft,
      geoContext,
      panelOpen,
      primeAgent,
      queuedDrafts,
      setPanelOpen,
      setUiContext,
      uiContext,
    ],
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
