"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WORKSPACE_CARD_GROUPS } from "@/lib/workspace-cards";
import { cn } from "@/lib/utils";
import { WorkspaceCardDefinition, WorkspaceCardId } from "@/types";
import { WorkspaceCardIcon } from "./WorkspaceCardIcon";

interface WorkspaceLibraryProps {
  cards: WorkspaceCardDefinition[];
  visibility: Record<WorkspaceCardId, boolean>;
  onToggleCard: (cardId: WorkspaceCardId, visible: boolean) => void;
  onOpenCard: (cardId: WorkspaceCardId) => void;
}

export function WorkspaceLibrary({
  cards,
  visibility,
  onToggleCard,
  onOpenCard,
}: WorkspaceLibraryProps) {
  const [query, setQuery] = useState("");

  const groupedCards = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const filtered = normalized
      ? cards.filter((card) =>
          [card.title, card.summary, card.category]
            .join(" ")
            .toLowerCase()
            .includes(normalized),
        )
      : cards;

    return WORKSPACE_CARD_GROUPS.map((group) => ({
      ...group,
      cards: filtered.filter((card) => card.category === group.key),
    })).filter((group) => group.cards.length > 0);
  }, [cards, query]);

  return (
    <section className="space-y-5">
      <div className="rounded-[2rem] border border-[color:var(--border-soft)] bg-[var(--surface-panel)] p-5 shadow-[var(--shadow-panel)] backdrop-blur-xl">
        <div className="space-y-2">
          <div className="eyebrow">Card library</div>
          <h2 className="text-2xl font-semibold text-[var(--foreground)]">
            Build a calmer dashboard board
          </h2>
          <p className="text-sm leading-6 text-[var(--muted-foreground)]">
            Open only the views you want in focus. Add cards to the board, then switch back to
            compare them one at a time instead of flooding the workspace.
          </p>
        </div>

        <div className="relative mt-5">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search cards, analysis views, or tools"
            className="pl-11"
          />
        </div>
      </div>

      <div className="space-y-5">
        {groupedCards.map((group) => (
          <section key={group.key} className="space-y-3">
            <div className="eyebrow">{group.label}</div>
            <div className="grid gap-4 xl:grid-cols-2">
              {group.cards.map((card) => {
                const visible = visibility[card.id];
                return (
                  <div
                    key={card.id}
                    className={cn(
                      "group rounded-[1.75rem] border p-5 transition duration-300",
                      visible
                        ? "border-[var(--border-strong)] bg-[var(--surface-soft)] shadow-[var(--shadow-soft)]"
                        : "border-[color:var(--border-soft)] bg-[var(--surface-raised)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-soft)]",
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[color:var(--border-soft)] bg-[var(--surface-soft)] text-[var(--accent)]">
                          <WorkspaceCardIcon icon={card.icon} className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="text-lg font-semibold text-[var(--foreground)]">
                            {card.title}
                          </div>
                          <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                            {card.summary}
                          </p>
                        </div>
                      </div>
                      <span className="rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-soft)] px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
                        {card.emphasis}
                      </span>
                    </div>

                    <div className="mt-5 flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="rounded-full"
                        onClick={() => onOpenCard(card.id)}
                      >
                        Open on board
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={visible ? "ghost" : "default"}
                        className="rounded-full"
                        onClick={() => onToggleCard(card.id, !visible)}
                      >
                        {visible ? "Hide card" : "Add card"}
                      </Button>
                      <span className="text-xs text-[var(--muted-foreground)]">
                        {card.emptyState}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}
