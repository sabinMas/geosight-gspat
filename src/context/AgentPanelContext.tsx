"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  AgentId,
  GeoSightContext,
  GeoSightUiContext,
  GeoSightViewportClass,
} from "@/lib/agents/agent-config";

type AgentPanelContextValue = {
  clearQueuedAutoSubmit: (agentId: AgentId) => void;
  activeAgentId: AgentId;
  clearQueuedDraft: (agentId: AgentId) => void;
  geoContext: GeoSightContext | null;
  openDefaultPanel: () => void;
  panelOpen: boolean;
  primeAgent: (agentId: AgentId, draft?: string) => void;
  queuedAutoSubmit: Partial<Record<AgentId, boolean>>;
  queuedDrafts: Partial<Record<AgentId, string>>;
  registerOpenChat: (fn: () => void) => void;
  openChat: () => void;
  setGeoContext: (ctx: GeoSightContext) => void;
  setPanelOpen: (open: boolean) => void;
  submitAgentPrompt: (agentId: AgentId, draft: string) => void;
  setUiContext: (ctx: Partial<GeoSightUiContext>) => void;
  uiContext: GeoSightUiContext | null;
};

const AgentPanelContext = createContext<AgentPanelContextValue | null>(null);

export function AgentPanelProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const openChatRef = useRef<(() => void) | null>(null);
  const [panelOpen, setPanelOpenState] = useState(false);
  const [activeAgentId, setActiveAgent] = useState<AgentId>("geo-analyst");
  const [geoContext, setGeoContext] = useState<GeoSightContext | null>(null);
  const [uiContext, setUiContextState] = useState<GeoSightUiContext | null>(null);
  const [queuedDrafts, setQueuedDrafts] = useState<Partial<Record<AgentId, string>>>({});
  const [queuedAutoSubmit, setQueuedAutoSubmit] = useState<Partial<Record<AgentId, boolean>>>({});

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

  const openDefaultPanel = useCallback(() => {
    setActiveAgent("geo-analyst");
    setPanelOpen(true);
  }, [setPanelOpen]);

  const registerOpenChat = useCallback((fn: () => void) => {
    openChatRef.current = fn;
  }, []);

  const openChat = useCallback(() => {
    openChatRef.current?.();
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

  const clearQueuedAutoSubmit = useCallback((agentId: AgentId) => {
    setQueuedAutoSubmit((current) => {
      if (!(agentId in current)) {
        return current;
      }

      const next = { ...current };
      delete next[agentId];
      return next;
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

  const submitAgentPrompt = useCallback(
    (agentId: AgentId, draft: string) => {
      const trimmedDraft = draft.trim();
      if (!trimmedDraft) {
        return;
      }

      setActiveAgent(agentId);
      setPanelOpen(true);
      setQueuedDrafts((current) => ({
        ...current,
        [agentId]: trimmedDraft,
      }));
      setQueuedAutoSubmit((current) => ({
        ...current,
        [agentId]: true,
      }));
    },
    [setPanelOpen],
  );

  const value = useMemo(
    () => ({
      activeAgentId,
      clearQueuedAutoSubmit,
      clearQueuedDraft,
      geoContext,
      openChat,
      openDefaultPanel,
      panelOpen,
      primeAgent,
      queuedAutoSubmit,
      queuedDrafts,
      registerOpenChat,
      setGeoContext,
      setPanelOpen,
      submitAgentPrompt,
      setUiContext,
      uiContext,
    }),
    [
      activeAgentId,
      clearQueuedAutoSubmit,
      clearQueuedDraft,
      geoContext,
      openChat,
      openDefaultPanel,
      panelOpen,
      primeAgent,
      queuedAutoSubmit,
      queuedDrafts,
      registerOpenChat,
      setPanelOpen,
      submitAgentPrompt,
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
    // Return a safe no-op fallback instead of throwing.
    // This occurs during Next.js App Router route transitions when a consuming
    // component briefly unmounts before the provider tree settles — throwing
    // here causes a client-side exception on browser Back navigation.
    return {
      activeAgentId: "geo-analyst" as AgentId,
      clearQueuedAutoSubmit: () => {},
      clearQueuedDraft: () => {},
      geoContext: null,
      openChat: () => {},
      openDefaultPanel: () => {},
      panelOpen: false,
      primeAgent: () => {},
      queuedAutoSubmit: {} as Partial<Record<AgentId, boolean>>,
      queuedDrafts: {} as Partial<Record<AgentId, string>>,
      registerOpenChat: () => {},
      setGeoContext: () => {},
      setPanelOpen: () => {},
      submitAgentPrompt: () => {},
      setUiContext: () => {},
      uiContext: null,
    } satisfies AgentPanelContextValue;
  }

  return context;
}
