"use client";

import { useEffect } from "react";
import { ChevronDown, ChevronUp, MessageSquareText } from "lucide-react";
import { AgentPanelProvider, useAgentPanel } from "@/context/AgentPanelContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import AgentChat from "./AgentChat";

function AgentPanelDrawer() {
  const { openDefaultPanel, panelOpen, setPanelOpen, uiContext } = useAgentPanel();
  const canShowPanel =
    uiContext?.currentRoute !== "/" && Boolean(uiContext?.locationSelected);
  const showFloatingTrigger = canShowPanel && uiContext?.visiblePrimaryCardId !== "chat";

  useEffect(() => {
    if (!canShowPanel && panelOpen) {
      setPanelOpen(false);
    }
  }, [canShowPanel, panelOpen, setPanelOpen]);

  useEffect(() => {
    if (!panelOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPanelOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [panelOpen, setPanelOpen]);

  if (!canShowPanel) {
    return null;
  }

  return (
    <>
      <div
        id="geosight-agent-panel"
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 transform-gpu transition-transform duration-[280ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
          panelOpen ? "translate-y-0" : "pointer-events-none translate-y-full",
        )}
        aria-hidden={!panelOpen}
      >
        <div className="h-[320px] border-t border-[color:var(--border-soft)] bg-[var(--surface-panel)] px-4 pb-4 pt-4 shadow-[var(--shadow-panel)] backdrop-blur-xl md:px-6">
          <div className="flex h-full flex-col gap-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
                  Ask GeoSight
                </div>
                <h2 className="mt-2 text-lg font-semibold text-[var(--foreground)]">
                  Ask about the active place
                </h2>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                  Run analysis, ask follow-up questions, or generate a grounded report from the current location context.
                </p>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="rounded-full"
                onClick={() => setPanelOpen(false)}
                aria-label="Close Ask GeoSight panel"
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>

            <AgentChat />
          </div>
        </div>
      </div>

      {showFloatingTrigger ? (
        <Button
          type="button"
          variant="secondary"
          className={cn(
            "fixed right-4 z-50 h-12 rounded-full px-4 shadow-[var(--shadow-panel)] transition-all duration-[280ms] ease-[cubic-bezier(0.16,1,0.3,1)] md:right-6 md:px-5",
            panelOpen ? "bottom-[336px]" : "bottom-4",
          )}
          onClick={() => {
            if (panelOpen) {
              setPanelOpen(false);
              return;
            }

            openDefaultPanel();
          }}
          aria-expanded={panelOpen}
          aria-controls="geosight-agent-panel"
          aria-label={panelOpen ? "Hide Ask GeoSight" : "Ask GeoSight"}
          title={panelOpen ? "Hide Ask GeoSight" : "Ask GeoSight"}
        >
          <MessageSquareText className="h-4 w-4" />
          <span className="ml-2 hidden text-sm md:inline">Ask GeoSight</span>
          {panelOpen ? (
            <ChevronDown className="ml-2 h-4 w-4" />
          ) : (
            <ChevronUp className="ml-2 h-4 w-4" />
          )}
        </Button>
      ) : null}
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
