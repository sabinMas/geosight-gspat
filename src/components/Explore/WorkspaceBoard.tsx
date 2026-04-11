"use client";

import { ReactNode, useRef, useState } from "react";
import { BookmarkPlus, Check, GripVertical, LayoutDashboard, Pencil, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SavedBoard, WorkspaceCardDefinition, WorkspaceCardId } from "@/types";
import { WorkspaceCardIcon } from "./WorkspaceCardIcon";

interface WorkspaceBoardProps {
  cards: WorkspaceCardDefinition[];
  openCardIds: WorkspaceCardId[];
  onToggleCard: (cardId: WorkspaceCardId) => void;
  onOpenLibrary: () => void;
  onReorderCards: (newOrder: WorkspaceCardId[]) => void;
  savedBoards: SavedBoard[];
  activeBoardId: string | null;
  onSaveBoard: (name: string) => void;
  onRestoreBoard: (boardId: string) => void;
  onDeleteBoard: (boardId: string) => void;
  onUpdateActiveBoard: () => void;
  onRenameBoard: (boardId: string, newName: string) => void;
  children: ReactNode;
}

export function WorkspaceBoard({
  cards,
  openCardIds,
  onToggleCard,
  onOpenLibrary,
  onReorderCards,
  savedBoards,
  activeBoardId,
  onSaveBoard,
  onRestoreBoard,
  onDeleteBoard,
  onUpdateActiveBoard,
  onRenameBoard,
  children,
}: WorkspaceBoardProps) {
  const [savingName, setSavingName] = useState<string | null>(null);
  const [savedConfirm, setSavedConfirm] = useState<string | null>(null);
  const [renamingBoardId, setRenamingBoardId] = useState<string | null>(null);
  const [renamingValue, setRenamingValue] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const [dragOverId, setDragOverId] = useState<WorkspaceCardId | null>(null);
  const dragSrcId = useRef<WorkspaceCardId | null>(null);

  function handleBeginSave() {
    setSavingName("");
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function handleCommitSave() {
    const trimmed = savingName?.trim() ?? "";
    if (!trimmed) {
      setSavingName(null);
      return;
    }
    onSaveBoard(trimmed);
    setSavedConfirm(trimmed);
    setSavingName(null);
    setTimeout(() => setSavedConfirm(null), 2000);
  }

  function handleBeginRename(board: SavedBoard) {
    setRenamingBoardId(board.id);
    setRenamingValue(board.name);
    requestAnimationFrame(() => renameInputRef.current?.focus());
  }

  function handleCommitRename() {
    if (renamingBoardId && renamingValue.trim()) {
      onRenameBoard(renamingBoardId, renamingValue.trim());
    }
    setRenamingBoardId(null);
    setRenamingValue("");
  }

  function handleCancelRename() {
    setRenamingBoardId(null);
    setRenamingValue("");
  }

  // Show "Save as new" disabled when at limit AND no active board (can't update instead)
  const atLimit = savedBoards.length >= 5 && activeBoardId === null;

  return (
    <section className="space-y-4">
      {/* Board header */}
      <div className="rounded-[2rem] border border-[color:var(--border-soft)] bg-[var(--surface-panel)] p-5 shadow-[var(--shadow-panel)] backdrop-blur-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <div className="eyebrow">Evidence tray</div>
            <h2 className="text-2xl font-semibold text-[var(--foreground)]">
              Supporting analysis panels
            </h2>
          </div>
          <Button type="button" variant="secondary" className="rounded-full shrink-0" onClick={onOpenLibrary}>
            Customize panels
          </Button>
        </div>

        {cards.length > 0 ? (
          <div className="mt-5 flex flex-wrap gap-2">
            {cards.map((card) => {
              const isOpen = openCardIds.includes(card.id);
              return (
                <div
                  key={card.id}
                  draggable
                  onDragStart={() => { dragSrcId.current = card.id; }}
                  onDragOver={(e) => { e.preventDefault(); setDragOverId(card.id); }}
                  onDragLeave={() => setDragOverId(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOverId(null);
                    if (!dragSrcId.current || dragSrcId.current === card.id) return;
                    const ids = cards.map((c) => c.id);
                    const fromIdx = ids.indexOf(dragSrcId.current);
                    const toIdx = ids.indexOf(card.id);
                    const next = [...ids];
                    next.splice(fromIdx, 1);
                    next.splice(toIdx, 0, dragSrcId.current);
                    onReorderCards(next);
                    dragSrcId.current = null;
                  }}
                  onDragEnd={() => { setDragOverId(null); dragSrcId.current = null; }}
                  className={cn(
                    "group inline-flex items-center gap-2 rounded-full border transition duration-300",
                    isOpen
                      ? "border-[var(--accent-strong)] bg-[var(--accent-soft)] ring-2 ring-[var(--accent)]"
                      : "border-[color:var(--border-soft)] bg-[var(--surface-raised)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-soft)]",
                    dragOverId === card.id && !isOpen ? "ring-2 ring-[var(--accent)] ring-opacity-50" : "",
                  )}
                >
                  <GripVertical
                    aria-hidden
                    className="ml-2 h-4 w-4 shrink-0 cursor-grab text-[var(--muted-foreground)]"
                  />
                  <button
                    type="button"
                    onClick={() => onToggleCard(card.id)}
                    aria-pressed={isOpen}
                    className="inline-flex items-center gap-2 py-2.5 pr-4 text-left"
                  >
                    <div className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-full border",
                      isOpen
                        ? "border-[color:var(--accent-strong)] bg-[var(--accent-soft)] text-[var(--accent)]"
                        : "border-[color:var(--border-soft)] bg-[var(--surface-soft)] text-[var(--accent)]",
                    )}>
                      <WorkspaceCardIcon icon={card.icon} className="h-4 w-4" />
                    </div>
                    <div className={cn(
                      "text-sm font-semibold",
                      isOpen ? "text-[var(--accent-foreground)]" : "text-[var(--foreground)]",
                    )}>{card.title}</div>
                  </button>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>

      {/* Saved layouts */}
      <div className="rounded-[2rem] border border-[color:var(--border-soft)] bg-[var(--surface-panel)] p-5 shadow-[var(--shadow-panel)] backdrop-blur-xl">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-soft)] text-[var(--accent)]">
              <LayoutDashboard aria-hidden className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-semibold text-[var(--foreground)]">Saved analyst layouts</div>
              <div className="text-xs text-[var(--muted-foreground)]">
                {savedBoards.length === 0
                  ? "Save up to 5 named layouts for this profile"
                  : `${savedBoards.length} saved layout${savedBoards.length === 1 ? "" : "s"}`}
              </div>
            </div>
          </div>

          {savedConfirm ? (
            <div className="flex items-center gap-1.5 rounded-full border border-[color:var(--success-border)] bg-[var(--success-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--foreground)]">
              <Check aria-hidden className="h-3.5 w-3.5 shrink-0" />
              Saved &ldquo;{savedConfirm}&rdquo;
            </div>
          ) : savingName !== null ? (
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                value={savingName}
                onChange={(e) => setSavingName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCommitSave();
                  if (e.key === "Escape") setSavingName(null);
                }}
                placeholder="Name this layout"
                className="h-9 w-40 rounded-[1.25rem] border border-[color:var(--border-soft)] bg-[var(--surface-raised)] px-3 text-sm text-[var(--foreground)] outline-none focus:border-[color:var(--accent)]"
              />
              <Button type="button" size="sm" className="rounded-full" onClick={handleCommitSave}>
                Save
              </Button>
              <Button type="button" size="sm" variant="ghost" className="rounded-full" onClick={() => setSavingName(null)}>
                Cancel
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {activeBoardId !== null && (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="rounded-full"
                  onClick={onUpdateActiveBoard}
                >
                  <RefreshCw aria-hidden className="mr-1.5 h-3.5 w-3.5" />
                  Update active
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="rounded-full"
                onClick={handleBeginSave}
                disabled={atLimit}
              >
                <BookmarkPlus aria-hidden className="mr-1.5 h-3.5 w-3.5" />
                Save as new
              </Button>
            </div>
          )}
        </div>

        {savedBoards.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {savedBoards.map((board) => {
              const isActive = board.id === activeBoardId;
              return (
                <div
                  key={board.id}
                  className={cn(
                    "flex items-center gap-1 rounded-full border py-1.5 pl-4 pr-1.5 transition",
                    isActive
                      ? "border-[var(--accent-strong)] bg-[var(--accent-soft)] ring-2 ring-[var(--accent)]"
                      : "border-[color:var(--border-soft)] bg-[var(--surface-raised)] hover:border-[var(--border-strong)]",
                  )}
                >
                  {renamingBoardId === board.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        ref={renameInputRef}
                        value={renamingValue}
                        onChange={(e) => setRenamingValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleCommitRename();
                          if (e.key === "Escape") handleCancelRename();
                        }}
                        className="h-7 w-32 rounded-[1rem] border border-[color:var(--border-soft)] bg-[var(--surface-raised)] px-2 text-sm text-[var(--foreground)] outline-none focus:border-[color:var(--accent)]"
                      />
                      <Button type="button" size="sm" className="rounded-full h-7 px-2.5 text-xs" onClick={handleCommitRename}>
                        Save
                      </Button>
                      <Button type="button" size="sm" variant="ghost" className="rounded-full h-7 px-2.5 text-xs" onClick={handleCancelRename}>
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => onRestoreBoard(board.id)}
                        className="flex items-center gap-1.5 text-left"
                      >
                        <span className={cn("text-sm font-semibold", isActive ? "text-[var(--accent-foreground)]" : "text-[var(--foreground)]")}>
                          {board.name}
                        </span>
                        <span className="text-xs text-[var(--muted-foreground)]">
                          · {board.visibleCardIds.length} cards
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleBeginRename(board)}
                        aria-label={`Rename layout "${board.name}"`}
                        className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--muted-foreground)] transition hover:text-[var(--foreground)]"
                      >
                        <Pencil aria-hidden className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteBoard(board.id)}
                        aria-label={`Delete layout "${board.name}"`}
                        className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--muted-foreground)] transition hover:text-[var(--foreground)]"
                      >
                        <Trash2 aria-hidden className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="space-y-4">{children}</div>
    </section>
  );
}
