"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, MessageSquareText } from "lucide-react";
import { AgentPanelProvider, useAgentPanel } from "@/context/AgentPanelContext";
import { AGENT_CONFIGS } from "@/lib/agents/agent-config";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import AgentChat from "./AgentChat";
import AgentSelector from "./AgentSelector";

function AgentPanelDrawer() {
  const { activeAgentId } = useAgentPanel();
  const [open, setOpen] = useState(false);
  const activeAgent = AGENT_CONFIGS[activeAgentId];

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  return (
    <>
      <div
        id="geosight-agent-panel"
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 transform-gpu transition-transform duration-[280ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
          open ? "translate-y-0" : "translate-y-full pointer-events-none",
        )}
        aria-hidden={!open}
      >
        <div className="h-[320px] border-t border-[color:var(--border-soft)] bg-[var(--surface-panel)] px-4 pb-4 pt-4 shadow-[var(--shadow-panel)] backdrop-blur-xl md:px-6">
          <div className="flex h-full flex-col gap-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="eyebrow">Multi-agent desk</div>
                <div className="mt-2 flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: activeAgent.accentColor }}
                    aria-hidden="true"
                  />
                  <h2 className="text-lg font-semibold text-[var(--foreground)]">
                    {activeAgent.name}
                  </h2>
                </div>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                  {activeAgent.tagline}
                </p>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="rounded-full"
                onClick={() => setOpen(false)}
                aria-label="Close multi-agent panel"
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>

            <AgentSelector />
            <AgentChat />
          </div>
        </div>
      </div>

      <Button
        type="button"
        variant="secondary"
        className={cn(
          "fixed right-4 z-50 h-12 rounded-full px-5 shadow-[var(--shadow-panel)] transition-all duration-[280ms] ease-[cubic-bezier(0.16,1,0.3,1)] md:right-6",
          open ? "bottom-[336px]" : "bottom-4",
        )}
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls="geosight-agent-panel"
      >
        <MessageSquareText className="mr-2 h-4 w-4" />
        {activeAgent.name}
        {open ? (
          <ChevronDown className="ml-2 h-4 w-4" />
        ) : (
          <ChevronUp className="ml-2 h-4 w-4" />
        )}
      </Button>
    </>
  );
}

export default function AgentPanel({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AgentPanelProvider>
      {children}
      <AgentPanelDrawer />
    </AgentPanelProvider>
  );
}
