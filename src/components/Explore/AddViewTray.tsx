"use client";

import { Grid2x2, Pin, Plus, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WorkspaceCardDefinition, WorkspaceCardId } from "@/types";
import { WorkspaceCardIcon } from "./WorkspaceCardIcon";

interface AddViewTrayProps {
  cards: WorkspaceCardDefinition[];
  pinnedCardIds: WorkspaceCardId[];
  onOpenCard: (cardId: WorkspaceCardId) => void;
  onTogglePinned: (cardId: WorkspaceCardId) => void;
  onOpenBoard: () => void;
}

export function AddViewTray({
  cards,
  pinnedCardIds,
  onOpenCard,
  onTogglePinned,
  onOpenBoard,
}: AddViewTrayProps) {
  return (
    <section className="rounded-[1.75rem] border border-[color:var(--border-soft)] bg-[var(--surface-panel)] p-4 shadow-[var(--shadow-panel)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="eyebrow">Add panel</div>
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Open only the evidence you need next</h2>
          <p className="max-w-2xl text-sm leading-6 text-[var(--muted-foreground)]">
            Suggested supporting panels stay tucked away until you need more depth.
          </p>
        </div>
        <Button type="button" variant="secondary" className="shrink-0 rounded-full" onClick={onOpenBoard}>
          <Grid2x2 className="mr-1.5 h-3.5 w-3.5" />
          Workbench
        </Button>
      </div>

      <div className="mt-3 rounded-[1.25rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] px-4 py-3 text-sm leading-6 text-[var(--muted-foreground)]">
        Workbench mode unlocks the full evidence canvas, reusable layouts, and the complete panel library while keeping the globe and active place in view.
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {cards.length ? (
          cards.map((card) => {
            const pinned = pinnedCardIds.includes(card.id);

            return (
              <div
                key={card.id}
                className="flex min-w-0 items-start justify-between gap-3 rounded-[1.35rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4"
              >
                <div className="flex min-w-0 gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[color:var(--border-soft)] bg-[var(--surface-raised)] text-[var(--accent)]">
                    <WorkspaceCardIcon icon={card.icon} className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="line-clamp-2 text-sm font-semibold text-[var(--foreground)]">
                      {card.title}
                    </div>
                    <p className="mt-1 line-clamp-3 text-sm leading-6 text-[var(--muted-foreground)]">
                      {card.summaryVariant}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <Button
                    type="button"
                    size="sm"
                    className="rounded-full"
                    onClick={() => onOpenCard(card.id)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Open
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="rounded-full"
                    onClick={() => onTogglePinned(card.id)}
                  >
                    {pinned ? <Pin className="mr-2 h-4 w-4" /> : <Star className="mr-2 h-4 w-4" />}
                    {pinned ? "Pinned" : "Pin"}
                  </Button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-[1.35rem] border border-dashed border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4 text-sm leading-6 text-[var(--muted-foreground)] lg:col-span-2">
            GeoSight does not have another suggested supporting panel yet. Open the analyst workbench if you want the full evidence library.
          </div>
        )}
      </div>
    </section>
  );
}
