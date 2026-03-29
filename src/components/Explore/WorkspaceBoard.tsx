"use client";

import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { WorkspaceCardDefinition, WorkspaceCardId } from "@/types";
import { WorkspaceCardIcon } from "./WorkspaceCardIcon";

interface WorkspaceBoardProps {
  cards: WorkspaceCardDefinition[];
  activeCardId: WorkspaceCardId | null;
  onSelectCard: (cardId: WorkspaceCardId) => void;
  onOpenLibrary: () => void;
  children: ReactNode;
}

export function WorkspaceBoard({
  cards,
  activeCardId,
  onSelectCard,
  onOpenLibrary,
  children,
}: WorkspaceBoardProps) {
  return (
    <section className="space-y-4">
      <div className="rounded-[2rem] border border-[color:var(--border-soft)] bg-[var(--surface-panel)] p-5 shadow-[var(--shadow-panel)] backdrop-blur-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="eyebrow">Secondary views</div>
            <h2 className="text-2xl font-semibold text-[var(--foreground)]">
              Open one supporting view at a time
            </h2>
          </div>
          <Button type="button" variant="secondary" className="rounded-full" onClick={onOpenLibrary}>
            Customize views
          </Button>
        </div>

        {cards.length > 0 ? (
          <div className="mt-5 flex flex-wrap gap-2">
            {cards.map((card) => {
              const active = card.id === activeCardId;
              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => onSelectCard(card.id)}
                  className={cn(
                    "group inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-left transition duration-300",
                    active
                      ? "border-[var(--border-strong)] bg-[var(--surface-soft)] shadow-[var(--shadow-soft)]"
                      : "border-[color:var(--border-soft)] bg-[var(--surface-raised)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-soft)]",
                  )}
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-soft)] text-[var(--accent)]">
                    <WorkspaceCardIcon icon={card.icon} className="h-4 w-4" />
                  </div>
                  <div className="text-sm font-semibold text-[var(--foreground)]">{card.title}</div>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      <div className="space-y-4">{children}</div>
    </section>
  );
}
