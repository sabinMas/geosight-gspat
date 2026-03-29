"use client";

import { AGENT_CONFIGS, AGENT_IDS } from "@/lib/agents/agent-registry";
import { useAgentPanel } from "@/context/AgentPanelContext";
import { cn } from "@/lib/utils";

export default function AgentSelector() {
  const { activeAgentId, setActiveAgent } = useAgentPanel();

  return (
    <div className="scrollbar-thin flex gap-2 overflow-x-auto pb-1">
      {AGENT_IDS.map((agentId) => {
        const agent = AGENT_CONFIGS[agentId];
        const isActive = agentId === activeAgentId;

        return (
          <button
            key={agent.id}
            type="button"
            onClick={() => setActiveAgent(agentId)}
            className={cn(
              "min-w-[220px] rounded-[1.35rem] border px-4 py-3 text-left transition duration-300",
              isActive
                ? "shadow-[var(--shadow-soft)]"
                : "border-[color:var(--border-soft)] bg-transparent hover:border-[var(--border-strong)] hover:bg-[var(--surface-soft)]",
            )}
            style={
              isActive
                ? {
                    borderColor: agent.accentColor,
                    background: `color-mix(in srgb, ${agent.accentColor} 10%, transparent)`,
                  }
                : undefined
            }
            aria-pressed={isActive}
          >
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: agent.accentColor }}
                aria-hidden="true"
              />
              <span className="text-sm font-semibold text-[var(--foreground)]">{agent.name}</span>
            </div>
            <div className="mt-1 text-xs text-[var(--muted-foreground)]">{agent.tagline}</div>
          </button>
        );
      })}
    </div>
  );
}
