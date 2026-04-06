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
  activeBoardCards?: Record<string, WorkspaceCardId>;
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

function getInitialPresentationState(
  profileId: string,
  visibleWorkspaceCardIds: WorkspaceCardId[],
  visiblePrimaryCardIds: WorkspaceCardId[],
) {
  const stored = readStoredPresentation();
  const legacyProfileId = profileId === "site-development" ? "residential" : profileId;
  const storedBoardCardId =
    stored.activeBoardCards?.[profileId] ?? stored.activeBoardCards?.[legacyProfileId];
  const storedPrimaryCardId =
    stored.activePrimaryCards?.[profileId] ?? stored.activePrimaryCards?.[legacyProfileId];

  const profileBoards = (stored.savedBoards ?? []).filter(
    (board) => board.profileId === profileId || board.profileId === legacyProfileId,
  ).map((board) => ({ ...board, profileId }));

  const storedActiveBoardId = stored.activeBoardId ?? null;
  const activeBoardId = storedActiveBoardId && profileBoards.some((b) => b.id === storedActiveBoardId)
    ? storedActiveBoardId
    : null;

  return {
    shellMode: stored.shellModes?.[profileId] ?? stored.shellModes?.[legacyProfileId] ?? "minimal",
    viewMode: stored.viewMode ?? "board",
    pinnedCardIds: stored.pinnedCards?.[profileId] ?? stored.pinnedCards?.[legacyProfileId] ?? [],
    savedBoards: profileBoards,
    activeBoardId,
    activeCardId:
      storedBoardCardId && visibleWorkspaceCardIds.includes(storedBoardCardId)
        ? storedBoardCardId
        : visibleWorkspaceCardIds[0] ?? null,
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
    () => getInitialPresentationState(normalizedProfileId, visibleWorkspaceCardIds, visiblePrimaryCardIds).shellMode,
  );
  const [viewMode, setViewModeState] = useState<WorkspaceViewMode>(
    () => getInitialPresentationState(normalizedProfileId, visibleWorkspaceCardIds, visiblePrimaryCardIds).viewMode,
  );
  const [activeCardId, setActiveCardIdState] = useState<WorkspaceCardId | null>(
    () => getInitialPresentationState(normalizedProfileId, visibleWorkspaceCardIds, visiblePrimaryCardIds).activeCardId,
  );
  const [activePrimaryCardId, setActivePrimaryCardIdState] = useState<WorkspaceCardId | null>(
    () =>
      getInitialPresentationState(normalizedProfileId, visibleWorkspaceCardIds, visiblePrimaryCardIds)
        .activePrimaryCardId,
  );
  const [pinnedCardIds, setPinnedCardIds] = useState<WorkspaceCardId[]>(
    () => getInitialPresentationState(normalizedProfileId, visibleWorkspaceCardIds, visiblePrimaryCardIds).pinnedCardIds,
  );
  const [savedBoards, setSavedBoards] = useState<SavedBoard[]>(
    () => getInitialPresentationState(normalizedProfileId, visibleWorkspaceCardIds, visiblePrimaryCardIds).savedBoards,
  );
  const [activeBoardId, setActiveBoardId] = useState<string | null>(
    () => getInitialPresentationState(normalizedProfileId, visibleWorkspaceCardIds, visiblePrimaryCardIds).activeBoardId,
  );
  const visibleWorkspaceCardIdsRef = useRef(visibleWorkspaceCardIds);
  const visiblePrimaryCardIdsRef = useRef(visiblePrimaryCardIds);

  useEffect(() => {
    visibleWorkspaceCardIdsRef.current = visibleWorkspaceCardIds;
  }, [visibleWorkspaceCardIds]);

  useEffect(() => {
    visiblePrimaryCardIdsRef.current = visiblePrimaryCardIds;
  }, [visiblePrimaryCardIds]);

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
    setActiveCardIdState(stored.activeCardId);
    setActivePrimaryCardIdState(stored.activePrimaryCardId);
  }, [normalizedProfileId]);

  useEffect(() => {
    setActiveCardIdState((current) =>
      current && visibleWorkspaceCardIds.includes(current)
        ? current
        : visibleWorkspaceCardIds[0] ?? null,
    );
  }, [visibleWorkspaceCardIds]);

  useEffect(() => {
    setActivePrimaryCardIdState((current) =>
      current && visiblePrimaryCardIds.includes(current)
        ? current
        : visiblePrimaryCardIds[0] ?? null,
    );
  }, [visiblePrimaryCardIds]);

  const setShellMode = useCallback((nextShellMode: WorkspaceShellMode) => {
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
      activePrimaryCards: stored.activePrimaryCards ?? {},
      pinnedCards: stored.pinnedCards ?? {},
      savedBoards: stored.savedBoards ?? [],
    });
  }, [normalizedProfileId]);

  const setViewMode = useCallback((nextViewMode: WorkspaceViewMode) => {
    setViewModeState(nextViewMode);
    const stored = readStoredPresentation();
    writeStoredPresentation({
      ...stored,
      viewMode: nextViewMode,
      shellModes: stored.shellModes ?? {},
      activeBoardCards: stored.activeBoardCards ?? {},
      activePrimaryCards: stored.activePrimaryCards ?? {},
      pinnedCards: stored.pinnedCards ?? {},
      savedBoards: stored.savedBoards ?? [],
    });
  }, []);

  const setActiveCardId = useCallback((nextCardId: WorkspaceCardId) => {
    setActiveCardIdState(nextCardId);
    const stored = readStoredPresentation();
    writeStoredPresentation({
      ...stored,
      shellModes: stored.shellModes ?? {},
      viewMode: stored.viewMode ?? viewMode,
      activeBoardCards: {
        ...(stored.activeBoardCards ?? {}),
        [normalizedProfileId]: nextCardId,
      },
      activePrimaryCards: stored.activePrimaryCards ?? {},
      pinnedCards: stored.pinnedCards ?? {},
      savedBoards: stored.savedBoards ?? [],
    });
  }, [normalizedProfileId, viewMode]);

  const setActivePrimaryCardId = useCallback((nextCardId: WorkspaceCardId) => {
    setActivePrimaryCardIdState(nextCardId);
    const stored = readStoredPresentation();
    writeStoredPresentation({
      ...stored,
      shellModes: stored.shellModes ?? {},
      viewMode: stored.viewMode ?? viewMode,
      activeBoardCards: stored.activeBoardCards ?? {},
      activePrimaryCards: {
        ...(stored.activePrimaryCards ?? {}),
        [normalizedProfileId]: nextCardId,
      },
      pinnedCards: stored.pinnedCards ?? {},
      savedBoards: stored.savedBoards ?? [],
    });
  }, [normalizedProfileId, viewMode]);

  const saveCurrentBoard = useCallback((name: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      return;
    }

    const stored = readStoredPresentation();
    const existingBoards = stored.savedBoards ?? [];
    const nextBoard: SavedBoard = {
      id: crypto.randomUUID(),
      name: trimmedName,
      profileId: normalizedProfileId,
      activeCardId,
      visibleCardIds: visibleWorkspaceCardIds,
      createdAt: new Date().toISOString(),
    };
    const sameProfileBoards = [...existingBoards.filter((board) => board.profileId === normalizedProfileId), nextBoard]
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .slice(0, 5);
    const otherBoards = existingBoards.filter((board) => board.profileId !== normalizedProfileId);
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
  }, [activeCardId, normalizedProfileId, visibleWorkspaceCardIds]);

  const restoreBoard = useCallback((boardId: string) => {
    const stored = readStoredPresentation();
    const board = (stored.savedBoards ?? []).find(
      (candidate) => candidate.id === boardId && candidate.profileId === normalizedProfileId,
    );

    if (!board) {
      return;
    }

    if (setWorkspaceCardVisible) {
      for (const cardId of allWorkspaceCardIds) {
        setWorkspaceCardVisible(cardId, board.visibleCardIds.includes(cardId));
      }
    }

    const restoredActiveCardId =
      board.activeCardId && board.visibleCardIds.includes(board.activeCardId)
        ? board.activeCardId
        : board.visibleCardIds[0] ?? null;
    setActiveCardIdState(restoredActiveCardId);
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
      activeBoardCards: restoredActiveCardId
        ? {
            ...(stored.activeBoardCards ?? {}),
            [normalizedProfileId]: restoredActiveCardId,
          }
        : stored.activeBoardCards ?? {},
      activePrimaryCards: stored.activePrimaryCards ?? {},
      pinnedCards: stored.pinnedCards ?? {},
      savedBoards: stored.savedBoards ?? [],
      activeBoardId: boardId,
    });
  }, [allWorkspaceCardIds, normalizedProfileId, setWorkspaceCardVisible]);

  const deleteBoard = useCallback((boardId: string) => {
    const stored = readStoredPresentation();
    const nextBoards = (stored.savedBoards ?? []).filter((board) => board.id !== boardId);
    const nextActiveBoardId = stored.activeBoardId === boardId ? null : (stored.activeBoardId ?? null);
    writeStoredPresentation({
      ...stored,
      shellModes: stored.shellModes ?? {},
      pinnedCards: stored.pinnedCards ?? {},
      savedBoards: nextBoards,
      activeBoardId: nextActiveBoardId,
    });
    setSavedBoards(nextBoards.filter((board) => board.profileId === normalizedProfileId));
    setActiveBoardId(nextActiveBoardId);
  }, [normalizedProfileId]);

  const updateActiveBoard = useCallback(() => {
    if (!activeBoardId) return;
    const stored = readStoredPresentation();
    const existingBoards = stored.savedBoards ?? [];
    const nextBoards = existingBoards.map((board) =>
      board.id === activeBoardId
        ? {
            ...board,
            activeCardId,
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
  }, [activeBoardId, activeCardId, normalizedProfileId, visibleWorkspaceCardIds]);

  const renameBoard = useCallback((boardId: string, newName: string) => {
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
  }, [normalizedProfileId]);

  const togglePinnedCard = useCallback((cardId: WorkspaceCardId) => {
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
        activePrimaryCards: stored.activePrimaryCards ?? {},
        pinnedCards: {
          ...(stored.pinnedCards ?? {}),
          [normalizedProfileId]: next,
        },
        savedBoards: stored.savedBoards ?? [],
      });
      return next;
    });
  }, [normalizedProfileId]);

  return {
    shellMode,
    setShellMode,
    viewMode,
    setViewMode,
    activeCardId,
    setActiveCardId,
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
