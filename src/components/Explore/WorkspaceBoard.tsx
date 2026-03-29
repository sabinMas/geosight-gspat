"use client";

import { ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SavedBoard, WorkspaceCardDefinition, WorkspaceCardId } from "@/types";
import { WorkspaceCardIcon } from "./WorkspaceCardIcon";

interface WorkspaceBoardProps {
  cards: WorkspaceCardDefinition[];
  activeCardId: WorkspaceCardId | null;
  onSelectCard: (cardId: WorkspaceCardId) => void;
  onOpenLibrary: () => void;
  savedBoards: SavedBoard[];
  onSaveBoard: (name: string) => void;
  onRestoreBoard: (boardId: string) => void;
  onDeleteBoard: (boardId: string) => void;
  children: ReactNode;
}

export function WorkspaceBoard({
  cards,
  activeCardId,
  onSelectCard,
  onOpenLibrary,
  savedBoards,
  onSaveBoard,
  onRestoreBoard,
  onDeleteBoard,
  children,
}: WorkspaceBoardProps) {
  const [boardName, setBoardName] = useState("");

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

        <details className="mt-5 rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4">
          <summary className="cursor-pointer text-sm font-semibold text-[var(--foreground)]">
            Saved layouts ({savedBoards.length})
          </summary>
          <div className="mt-4 space-y-3">
            <div className="flex flex-col gap-3 md:flex-row">
              <input
                value={boardName}
                onChange={(event) => setBoardName(event.target.value)}
                placeholder="Name this board layout"
                className="h-11 flex-1 rounded-[1.25rem] border border-[color:var(--border-soft)] bg-[var(--surface-raised)] px-4 text-sm text-[var(--foreground)] outline-none"
              />
              <Button
                type="button"
                className="rounded-full"
                onClick={() => {
                  const trimmed = boardName.trim();
                  if (!trimmed) {
                    return;
                  }

                  onSaveBoard(trimmed);
                  setBoardName("");
                }}
              >
                Save layout
              </Button>
            </div>

            {savedBoards.length ? (
              <div className="space-y-2">
                {savedBoards.map((board) => (
                  <div
                    key={board.id}
                    className="flex flex-col gap-3 rounded-[1.25rem] border border-[color:var(--border-soft)] bg-[var(--surface-raised)] px-4 py-3 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <div className="text-sm font-semibold text-[var(--foreground)]">{board.name}</div>
                      <div className="mt-1 text-xs text-[var(--muted-foreground)]">
                        {board.visibleCardIds.length} visible cards / saved{" "}
                        {new Date(board.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="rounded-full"
                        onClick={() => onRestoreBoard(board.id)}
                      >
                        Restore
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="rounded-full"
                        onClick={() => onDeleteBoard(board.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-[var(--muted-foreground)]">
                Save up to five named board layouts for this mission profile.
              </div>
            )}
          </div>
        </details>
      </div>

      <div className="space-y-4">{children}</div>
    </section>
  );
}
