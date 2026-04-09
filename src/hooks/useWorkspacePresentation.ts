"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { normalizeProfileId } from "@/lib/lenses";
import {
  SavedBoard,
  WorkspaceCardId,
  WorkspaceShellMode,
  WorkspaceViewMode,
} from "@/types";

const STORAGE_KEY = "geosight.workspace-presentation.v1";

interface StoredWorkspacePresentation {
  viewMode?: WorkspaceViewMode;
  shellModes?: Record<string, WorkspaceShellMode>;
  /** @deprecated — use openBoardCardIds */
  activeBoardCards?: Record<string, WorkspaceCardId>;
  openBoardCardIds?: Record<string, WorkspaceCardId[]>;
  activePrimaryCards?: Record<string, WorkspaceCardId>;
  pinnedCards?: Record<string, WorkspaceCardId[]>;
  savedBoards?: SavedBoard[];
  activeBoardId?: string | null;
}

function readStoredPresentation(): StoredWorkspacePresentation {
  if (typeof window === "undefined") {
    return {};
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return {};
  }

  try {
    return JSON.parse(stored) as StoredWorkspacePresentation;
  } catch {
    return {};
  }
}

function writeStoredPresentation(value: StoredWorkspacePresentation) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
}

function resolveOpenCardIds(
  stored: StoredWorkspacePresentation,
  profileId: string,
  legacyProfileId: string,
  visibleWorkspaceCardIds: WorkspaceCardId[],
): WorkspaceCardId[] {
  // Prefer new multi-card open list
  const storedOpen =
    stored.openBoardCardIds?.[profileId] ?? stored.openBoardCardIds?.[legacyProfileId];
  if (storedOpen) {
    const valid = storedOpen.filter((id) => visibleWorkspaceCardIds.includes(id));
    if (valid.length > 0) return valid;
  }

  // Fall back to legacy single-card selection
  const legacySingle =
    stored.activeBoardCards?.[profileId] ?? stored.activeBoardCards?.[legacyProfileId];
  if (legacySingle && visibleWorkspaceCardIds.includes(legacySingle)) {
    return [legacySingle];
  }

  // Default to first visible card
  return visibleWorkspaceCardIds[0] ? [visibleWorkspaceCardIds[0]] : [];
}

function getInitialPresentationState(
  profileId: string,
  visibleWorkspaceCardIds: WorkspaceCardId[],
  visiblePrimaryCardIds: WorkspaceCardId[],
) {
  const stored = readStoredPresentation();
  const legacyProfileId = profileId === "site-development" ? "residential" : profileId;
  const storedPrimaryCardId =
    stored.activePrimaryCards?.[profileId] ?? stored.activePrimaryCards?.[legacyProfileId];

  const profileBoards = (stored.savedBoards ?? [])
    .filter((board) => board.profileId === profileId || board.profileId === legacyProfileId)
    .map((board) => ({ ...board, profileId }));

  const storedActiveBoardId = stored.activeBoardId ?? null;
  const activeBoardId =
    storedActiveBoardId && profileBoards.some((b) => b.id === storedActiveBoardId)
      ? storedActiveBoardId
      : null;

  return {
    shellMode: stored.shellModes?.[profileId] ?? stored.shellModes?.[legacyProfileId] ?? "minimal",
    viewMode: stored.viewMode ?? "board",
    pinnedCardIds: stored.pinnedCards?.[profileId] ?? stored.pinnedCards?.[legacyProfileId] ?? [],
    savedBoards: profileBoards,
    activeBoardId,
    openCardIds: resolveOpenCardIds(stored, profileId, legacyProfileId, visibleWorkspaceCardIds),
    activePrimaryCardId:
      storedPrimaryCardId && visiblePrimaryCardIds.includes(storedPrimaryCardId)
        ? storedPrimaryCardId
        : visiblePrimaryCardIds[0] ?? null,
  };
}

export function useWorkspacePresentation(
  profileId: string,
  allWorkspaceCardIds: WorkspaceCardId[],
  visibleWorkspaceCardIds: WorkspaceCardId[],
  visiblePrimaryCardIds: WorkspaceCardId[] = [],
  setWorkspaceCardVisible?: (cardId: WorkspaceCardId, visible: boolean) => void,
) {
  const normalizedProfileId = normalizeProfileId(profileId) ?? profileId;
  const [shellMode, setShellModeState] = useState<WorkspaceShellMode>(
    () =>
      getInitialPresentationState(normalizedProfileId, visibleWorkspaceCardIds, visiblePrimaryCardIds)
        .shellMode,
  );
  const [viewMode, setViewModeState] = useState<WorkspaceViewMode>(
    () =>
      getInitialPresentationState(normalizedProfileId, visibleWorkspaceCardIds, visiblePrimaryCardIds)
        .viewMode,
  );
  const [openCardIds, setOpenCardIdsState] = useState<WorkspaceCardId[]>(
    () =>
      getInitialPresentationState(normalizedProfileId, visibleWorkspaceCardIds, visiblePrimaryCardIds)
        .openCardIds,
  );
  const [activePrimaryCardId, setActivePrimaryCardIdState] = useState<WorkspaceCardId | null>(
    () =>
      getInitialPresentationState(normalizedProfileId, visibleWorkspaceCardIds, visiblePrimaryCardIds)
        .activePrimaryCardId,
  );
  const [pinnedCardIds, setPinnedCardIds] = useState<WorkspaceCardId[]>(
    () =>
      getInitialPresentationState(normalizedProfileId, visibleWorkspaceCardIds, visiblePrimaryCardIds)
        .pinnedCardIds,
  );
  const [savedBoards, setSavedBoards] = useState<SavedBoard[]>(
    () =>
      getInitialPresentationState(normalizedProfileId, visibleWorkspaceCardIds, visiblePrimaryCardIds)
        .savedBoards,
  );
  const [activeBoardId, setActiveBoardId] = useState<string | null>(
    () =>
      getInitialPresentationState(normalizedProfileId, visibleWorkspaceCardIds, visiblePrimaryCardIds)
        .activeBoardId,
  );
  const visibleWorkspaceCardIdsRef = useRef(visibleWorkspaceCardIds);
  const visiblePrimaryCardIdsRef = useRef(visiblePrimaryCardIds);

  useEffect(() => {
    visibleWorkspaceCardIdsRef.current = visibleWorkspaceCardIds;
  }, [visibleWorkspaceCardIds]);

  useEffect(() => {
    visiblePrimaryCardIdsRef.current = visiblePrimaryCardIds;
  }, [visiblePrimaryCardIds]);

  // Reset state when profile changes
  useEffect(() => {
    const stored = getInitialPresentationState(
      normalizedProfileId,
      visibleWorkspaceCardIdsRef.current,
      visiblePrimaryCardIdsRef.current,
    );
    setShellModeState(stored.shellMode);
    setViewModeState(stored.viewMode);
    setPinnedCardIds(stored.pinnedCardIds);
    setSavedBoards(stored.savedBoards);
    setActiveBoardId(stored.activeBoardId);
    setOpenCardIdsState(stored.openCardIds);
    setActivePrimaryCardIdState(stored.activePrimaryCardId);
  }, [normalizedProfileId]);

  // Remove open cards that are no longer visible
  useEffect(() => {
    setOpenCardIdsState((current) =>
      current.filter((id) => visibleWorkspaceCardIds.includes(id)),
    );
  }, [visibleWorkspaceCardIds]);

  useEffect(() => {
    setActivePrimaryCardIdState((current) =>
      current && visiblePrimaryCardIds.includes(current)
        ? current
        : visiblePrimaryCardIds[0] ?? null,
    );
  }, [visiblePrimaryCardIds]);

  function writeOpenCardIds(next: WorkspaceCardId[]) {
    const stored = readStoredPresentation();
    writeStoredPresentation({
      ...stored,
      shellModes: stored.shellModes ?? {},
      viewMode: stored.viewMode ?? "board",
      activeBoardCards: stored.activeBoardCards ?? {},
      openBoardCardIds: {
        ...(stored.openBoardCardIds ?? {}),
        [normalizedProfileId]: next,
      },
      activePrimaryCards: stored.activePrimaryCards ?? {},
      pinnedCards: stored.pinnedCards ?? {},
      savedBoards: stored.savedBoards ?? [],
    });
  }

  const openCard = useCallback(
    (cardId: WorkspaceCardId) => {
      setOpenCardIdsState((prev) => {
        if (prev.includes(cardId)) return prev;
        const next = [...prev, cardId];
        writeOpenCardIds(next);
        return next;
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [normalizedProfileId],
  );

  const closeCard = useCallback(
    (cardId: WorkspaceCardId) => {
      setOpenCardIdsState((prev) => {
        const next = prev.filter((id) => id !== cardId);
        writeOpenCardIds(next);
        return next;
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [normalizedProfileId],
  );

  const toggleOpenCard = useCallback(
    (cardId: WorkspaceCardId) => {
      setOpenCardIdsState((prev) => {
        const next = prev.includes(cardId)
          ? prev.filter((id) => id !== cardId)
          : [...prev, cardId];
        writeOpenCardIds(next);
        return next;
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [normalizedProfileId],
  );

  const setShellMode = useCallback(
    (nextShellMode: WorkspaceShellMode) => {
      setShellModeState(nextShellMode);
      const stored = readStoredPresentation();
      writeStoredPresentation({
        ...stored,
        shellModes: {
          ...(stored.shellModes ?? {}),
          [normalizedProfileId]: nextShellMode,
        },
        viewMode: stored.viewMode ?? "board",
        activeBoardCards: stored.activeBoardCards ?? {},
        openBoardCardIds: stored.openBoardCardIds ?? {},
        activePrimaryCards: stored.activePrimaryCards ?? {},
        pinnedCards: stored.pinnedCards ?? {},
        savedBoards: stored.savedBoards ?? [],
      });
    },
    [normalizedProfileId],
  );

  const setViewMode = useCallback((nextViewMode: WorkspaceViewMode) => {
    setViewModeState(nextViewMode);
    const stored = readStoredPresentation();
    writeStoredPresentation({
      ...stored,
      viewMode: nextViewMode,
      shellModes: stored.shellModes ?? {},
      activeBoardCards: stored.activeBoardCards ?? {},
      openBoardCardIds: stored.openBoardCardIds ?? {},
      activePrimaryCards: stored.activePrimaryCards ?? {},
      pinnedCards: stored.pinnedCards ?? {},
      savedBoards: stored.savedBoards ?? [],
    });
  }, []);

  const setActivePrimaryCardId = useCallback(
    (nextCardId: WorkspaceCardId) => {
      setActivePrimaryCardIdState(nextCardId);
      const stored = readStoredPresentation();
      writeStoredPresentation({
        ...stored,
        shellModes: stored.shellModes ?? {},
        viewMode: stored.viewMode ?? viewMode,
        activeBoardCards: stored.activeBoardCards ?? {},
        openBoardCardIds: stored.openBoardCardIds ?? {},
        activePrimaryCards: {
          ...(stored.activePrimaryCards ?? {}),
          [normalizedProfileId]: nextCardId,
        },
        pinnedCards: stored.pinnedCards ?? {},
        savedBoards: stored.savedBoards ?? [],
      });
    },
    [normalizedProfileId, viewMode],
  );

  const saveCurrentBoard = useCallback(
    (name: string) => {
      const trimmedName = name.trim();
      if (!trimmedName) return;

      const stored = readStoredPresentation();
      const existingBoards = stored.savedBoards ?? [];
      const nextBoard: SavedBoard = {
        id: crypto.randomUUID(),
        name: trimmedName,
        profileId: normalizedProfileId,
        activeCardId: openCardIds[0] ?? null,
        openCardIds: [...openCardIds],
        visibleCardIds: visibleWorkspaceCardIds,
        createdAt: new Date().toISOString(),
      };
      const sameProfileBoards = [
        ...existingBoards.filter((board) => board.profileId === normalizedProfileId),
        nextBoard,
      ]
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
        .slice(0, 5);
      const otherBoards = existingBoards.filter(
        (board) => board.profileId !== normalizedProfileId,
      );
      const nextBoards = [...otherBoards, ...sameProfileBoards];

      writeStoredPresentation({
        ...stored,
        shellModes: stored.shellModes ?? {},
        pinnedCards: stored.pinnedCards ?? {},
        savedBoards: nextBoards,
        activeBoardId: nextBoard.id,
      });
      setSavedBoards(sameProfileBoards);
      setActiveBoardId(nextBoard.id);
    },
    [normalizedProfileId, openCardIds, visibleWorkspaceCardIds],
  );

  const restoreBoard = useCallback(
    (boardId: string) => {
      const stored = readStoredPresentation();
      const board = (stored.savedBoards ?? []).find(
        (candidate) =>
          candidate.id === boardId && candidate.profileId === normalizedProfileId,
      );

      if (!board) return;

      if (setWorkspaceCardVisible) {
        for (const cardId of allWorkspaceCardIds) {
          setWorkspaceCardVisible(cardId, board.visibleCardIds.includes(cardId));
        }
      }

      // Prefer new openCardIds, fall back to legacy activeCardId
      const restoredOpenCardIds =
        board.openCardIds?.filter((id) => board.visibleCardIds.includes(id)) ??
        (board.activeCardId && board.visibleCardIds.includes(board.activeCardId)
          ? [board.activeCardId]
          : board.visibleCardIds.slice(0, 1));

      setOpenCardIdsState(restoredOpenCardIds);
      setShellModeState("board");
      setViewModeState("board");
      setActiveBoardId(boardId);

      writeStoredPresentation({
        ...stored,
        shellModes: {
          ...(stored.shellModes ?? {}),
          [normalizedProfileId]: "board",
        },
        viewMode: "board",
        activeBoardCards: stored.activeBoardCards ?? {},
        openBoardCardIds: {
          ...(stored.openBoardCardIds ?? {}),
          [normalizedProfileId]: restoredOpenCardIds,
        },
        activePrimaryCards: stored.activePrimaryCards ?? {},
        pinnedCards: stored.pinnedCards ?? {},
        savedBoards: stored.savedBoards ?? [],
        activeBoardId: boardId,
      });
    },
    [allWorkspaceCardIds, normalizedProfileId, setWorkspaceCardVisible],
  );

  const deleteBoard = useCallback(
    (boardId: string) => {
      const stored = readStoredPresentation();
      const nextBoards = (stored.savedBoards ?? []).filter((board) => board.id !== boardId);
      const nextActiveBoardId =
        stored.activeBoardId === boardId ? null : (stored.activeBoardId ?? null);
      writeStoredPresentation({
        ...stored,
        shellModes: stored.shellModes ?? {},
        pinnedCards: stored.pinnedCards ?? {},
        savedBoards: nextBoards,
        activeBoardId: nextActiveBoardId,
      });
      setSavedBoards(nextBoards.filter((board) => board.profileId === normalizedProfileId));
      setActiveBoardId(nextActiveBoardId);
    },
    [normalizedProfileId],
  );

  const updateActiveBoard = useCallback(() => {
    if (!activeBoardId) return;
    const stored = readStoredPresentation();
    const existingBoards = stored.savedBoards ?? [];
    const nextBoards = existingBoards.map((board) =>
      board.id === activeBoardId
        ? {
            ...board,
            activeCardId: openCardIds[0] ?? null,
            openCardIds: [...openCardIds],
            visibleCardIds: visibleWorkspaceCardIds,
          }
        : board,
    );
    writeStoredPresentation({
      ...stored,
      shellModes: stored.shellModes ?? {},
      pinnedCards: stored.pinnedCards ?? {},
      savedBoards: nextBoards,
      activeBoardId,
    });
    setSavedBoards(nextBoards.filter((board) => board.profileId === normalizedProfileId));
  }, [activeBoardId, normalizedProfileId, openCardIds, visibleWorkspaceCardIds]);

  const renameBoard = useCallback(
    (boardId: string, newName: string) => {
      const trimmedName = newName.trim();
      if (!trimmedName) return;
      const stored = readStoredPresentation();
      const nextBoards = (stored.savedBoards ?? []).map((board) =>
        board.id === boardId ? { ...board, name: trimmedName } : board,
      );
      writeStoredPresentation({
        ...stored,
        shellModes: stored.shellModes ?? {},
        pinnedCards: stored.pinnedCards ?? {},
        savedBoards: nextBoards,
        activeBoardId: stored.activeBoardId ?? null,
      });
      setSavedBoards(nextBoards.filter((board) => board.profileId === normalizedProfileId));
    },
    [normalizedProfileId],
  );

  const togglePinnedCard = useCallback(
    (cardId: WorkspaceCardId) => {
      setPinnedCardIds((current) => {
        const next = current.includes(cardId)
          ? current.filter((candidate) => candidate !== cardId)
          : [...current, cardId];
        const stored = readStoredPresentation();
        writeStoredPresentation({
          ...stored,
          shellModes: stored.shellModes ?? {},
          viewMode: stored.viewMode ?? "board",
          activeBoardCards: stored.activeBoardCards ?? {},
          openBoardCardIds: stored.openBoardCardIds ?? {},
          activePrimaryCards: stored.activePrimaryCards ?? {},
          pinnedCards: {
            ...(stored.pinnedCards ?? {}),
            [normalizedProfileId]: next,
          },
          savedBoards: stored.savedBoards ?? [],
        });
        return next;
      });
    },
    [normalizedProfileId],
  );

  return {
    shellMode,
    setShellMode,
    viewMode,
    setViewMode,
    openCardIds,
    openCard,
    closeCard,
    toggleOpenCard,
    activePrimaryCardId,
    setActivePrimaryCardId,
    pinnedCardIds,
    togglePinnedCard,
    savedBoards,
    activeBoardId,
    saveCurrentBoard,
    restoreBoard,
    deleteBoard,
    updateActiveBoard,
    renameBoard,
  };
}
