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
    <section className="space-y-5">
      <div className="rounded-[2rem] border border-[color:var(--border-soft)] bg-[var(--surface-panel)] p-5 shadow-[var(--shadow-panel)] backdrop-blur-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <div className="eyebrow">Board view</div>
            <h2 className="text-2xl font-semibold text-[var(--foreground)]">
              Focus one analysis view at a time
            </h2>
            <p className="max-w-3xl text-sm leading-6 text-[var(--muted-foreground)]">
              Use the board like a Tableau workbook. Keep the globe alive, then open the exact
              card you need instead of scanning every panel at once.
            </p>
          </div>
          <Button type="button" variant="secondary" className="rounded-full" onClick={onOpenLibrary}>
            Open card library
          </Button>
        </div>

        {cards.length > 0 ? (
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {cards.map((card) => {
              const active = card.id === activeCardId;
              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => onSelectCard(card.id)}
                  className={cn(
                    "group rounded-[1.5rem] border p-4 text-left transition duration-300",
                    active
                      ? "border-[var(--border-strong)] bg-[var(--surface-soft)] shadow-[var(--shadow-soft)]"
                      : "border-[color:var(--border-soft)] bg-[var(--surface-raised)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-soft)]",
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[color:var(--border-soft)] bg-[var(--surface-soft)] text-[var(--accent)]">
                      <WorkspaceCardIcon icon={card.icon} className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-semibold text-[var(--foreground)]">
                          {card.title}
                        </div>
                        <span className="rounded-full border border-[color:var(--border-soft)] px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
                          {card.emphasis}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                        {card.summary}
                      </p>
                    </div>
                  </div>
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
