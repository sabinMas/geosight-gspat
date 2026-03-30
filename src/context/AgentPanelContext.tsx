"use client";

import { createContext, useContext, useState } from "react";
import { AgentId, GeoSightContext } from "@/lib/agents/agent-config";

type AgentPanelContextValue = {
  activeAgentId: AgentId;
  setActiveAgent: (id: AgentId) => void;
  geoContext: GeoSightContext | null;
  setGeoContext: (ctx: GeoSightContext) => void;
};

const AgentPanelContext = createContext<AgentPanelContextValue | null>(null);

export function AgentPanelProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [activeAgentId, setActiveAgent] = useState<AgentId>("geo-analyst");
  const [geoContext, setGeoContext] = useState<GeoSightContext | null>(null);

  return (
    <AgentPanelContext.Provider
      value={{
        activeAgentId,
        setActiveAgent,
        geoContext,
        setGeoContext,
      }}
    >
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
