"use client";

import { Settings2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WORKSPACE_CARD_GROUPS } from "@/lib/workspace-cards";
import { cn } from "@/lib/utils";
import {
  WorkspaceCardDefinition,
  WorkspaceCardId,
} from "@/types";

interface WorkspaceCustomizerProps {
  open: boolean;
  cards: WorkspaceCardDefinition[];
  visibility: Record<WorkspaceCardId, boolean>;
  onOpen: () => void;
  onClose: () => void;
  onToggleCard: (cardId: WorkspaceCardId, visible: boolean) => void;
}

export function WorkspaceCustomizer({
  open,
  cards,
  visibility,
  onOpen,
  onClose,
  onToggleCard,
}: WorkspaceCustomizerProps) {
  const groupedCards = WORKSPACE_CARD_GROUPS.map((group) => ({
    ...group,
    cards: cards.filter((card) => card.category === group.key),
  })).filter((group) => group.cards.length > 0);

  return (
    <>
      <Button type="button" variant="secondary" className="rounded-full" onClick={onOpen}>
        <Settings2 className="mr-2 h-4 w-4" />
        Customize workspace
      </Button>

      {open ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/70 backdrop-blur-sm">
          <div className="h-full w-full max-w-md overflow-y-auto border-l border-white/10 bg-[#07111d] p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-white">Workspace cards</h2>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Keep the first view calm, then turn on the cards you want in this browser for the
                  current mission profile.
                </p>
              </div>
              <Button type="button" size="icon" variant="ghost" className="rounded-full" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="mt-6 space-y-5">
              {groupedCards.map((group) => (
                <section key={group.key} className="space-y-3">
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-400">
                    {group.label}
                  </div>
                  <div className="space-y-3">
                    {group.cards.map((card) => {
                      const checked = visibility[card.id];
                      return (
                        <label
                          key={card.id}
                          className={cn(
                            "flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 transition",
                            checked
                              ? "border-cyan-300/25 bg-cyan-400/8"
                              : "border-white/10 bg-white/5 hover:bg-white/8",
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(event) => onToggleCard(card.id, event.target.checked)}
                            className="mt-1 h-4 w-4 rounded border-white/20 bg-slate-950 text-cyan-300"
                          />
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-white">{card.title}</div>
                            <div className="mt-1 text-xs leading-5 text-slate-400">
                              {card.emptyState}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
