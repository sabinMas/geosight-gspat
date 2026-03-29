"use client";

import { useCallback, useEffect, useState } from "react";
import { SavedBoard, WorkspaceCardId, WorkspaceViewMode } from "@/types";

const STORAGE_KEY = "geosight.workspace-presentation.v1";

interface StoredWorkspacePresentation {
  viewMode?: WorkspaceViewMode;
  activeBoardCards?: Record<string, WorkspaceCardId>;
  activePrimaryCards?: Record<string, WorkspaceCardId>;
  savedBoards?: SavedBoard[];
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

export function useWorkspacePresentation(
  profileId: string,
  allWorkspaceCardIds: WorkspaceCardId[],
  visibleWorkspaceCardIds: WorkspaceCardId[],
  visiblePrimaryCardIds: WorkspaceCardId[] = [],
  setWorkspaceCardVisible?: (cardId: WorkspaceCardId, visible: boolean) => void,
) {
  const [viewMode, setViewModeState] = useState<WorkspaceViewMode>("board");
  const [activeCardId, setActiveCardIdState] = useState<WorkspaceCardId | null>(
    visibleWorkspaceCardIds[0] ?? null,
  );
  const [activePrimaryCardId, setActivePrimaryCardIdState] = useState<WorkspaceCardId | null>(
    visiblePrimaryCardIds[0] ?? null,
  );
  const [savedBoards, setSavedBoards] = useState<SavedBoard[]>([]);

  useEffect(() => {
    const stored = readStoredPresentation();
    setViewModeState(stored.viewMode ?? "board");
    setSavedBoards((stored.savedBoards ?? []).filter((board) => board.profileId === profileId));

    const storedCardId = stored.activeBoardCards?.[profileId];
    if (storedCardId && visibleWorkspaceCardIds.includes(storedCardId)) {
      setActiveCardIdState(storedCardId);
    } else {
      setActiveCardIdState(visibleWorkspaceCardIds[0] ?? null);
    }

    const storedPrimaryCardId = stored.activePrimaryCards?.[profileId];
    if (storedPrimaryCardId && visiblePrimaryCardIds.includes(storedPrimaryCardId)) {
      setActivePrimaryCardIdState(storedPrimaryCardId);
    } else {
      setActivePrimaryCardIdState(visiblePrimaryCardIds[0] ?? null);
    }
  }, [profileId, visiblePrimaryCardIds, visibleWorkspaceCardIds]);

  const setViewMode = useCallback((nextViewMode: WorkspaceViewMode) => {
    setViewModeState(nextViewMode);
    const stored = readStoredPresentation();
    writeStoredPresentation({
      ...stored,
      viewMode: nextViewMode,
      activeBoardCards: stored.activeBoardCards ?? {},
      activePrimaryCards: stored.activePrimaryCards ?? {},
      savedBoards: stored.savedBoards ?? [],
    });
  }, []);

  const setActiveCardId = useCallback((nextCardId: WorkspaceCardId) => {
    setActiveCardIdState(nextCardId);
    const stored = readStoredPresentation();
    writeStoredPresentation({
      ...stored,
      viewMode: stored.viewMode ?? viewMode,
      activeBoardCards: {
        ...(stored.activeBoardCards ?? {}),
        [profileId]: nextCardId,
      },
      activePrimaryCards: stored.activePrimaryCards ?? {},
      savedBoards: stored.savedBoards ?? [],
    });
  }, [profileId, viewMode]);

  const setActivePrimaryCardId = useCallback((nextCardId: WorkspaceCardId) => {
    setActivePrimaryCardIdState(nextCardId);
    const stored = readStoredPresentation();
    writeStoredPresentation({
      ...stored,
      viewMode: stored.viewMode ?? viewMode,
      activeBoardCards: stored.activeBoardCards ?? {},
      activePrimaryCards: {
        ...(stored.activePrimaryCards ?? {}),
        [profileId]: nextCardId,
      },
      savedBoards: stored.savedBoards ?? [],
    });
  }, [profileId, viewMode]);

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
      profileId,
      activeCardId,
      visibleCardIds: visibleWorkspaceCardIds,
      createdAt: new Date().toISOString(),
    };
    const sameProfileBoards = [...existingBoards.filter((board) => board.profileId === profileId), nextBoard]
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .slice(0, 5);
    const otherBoards = existingBoards.filter((board) => board.profileId !== profileId);
    const nextBoards = [...otherBoards, ...sameProfileBoards];

    writeStoredPresentation({
      ...stored,
      savedBoards: nextBoards,
    });
    setSavedBoards(sameProfileBoards);
  }, [activeCardId, profileId, visibleWorkspaceCardIds]);

  const restoreBoard = useCallback((boardId: string) => {
    const stored = readStoredPresentation();
    const board = (stored.savedBoards ?? []).find(
      (candidate) => candidate.id === boardId && candidate.profileId === profileId,
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
    setViewModeState("board");

    writeStoredPresentation({
      ...stored,
      viewMode: "board",
      activeBoardCards: restoredActiveCardId
        ? {
            ...(stored.activeBoardCards ?? {}),
            [profileId]: restoredActiveCardId,
          }
        : stored.activeBoardCards ?? {},
      activePrimaryCards: stored.activePrimaryCards ?? {},
      savedBoards: stored.savedBoards ?? [],
    });
  }, [allWorkspaceCardIds, profileId, setWorkspaceCardVisible]);

  const deleteBoard = useCallback((boardId: string) => {
    const stored = readStoredPresentation();
    const nextBoards = (stored.savedBoards ?? []).filter((board) => board.id !== boardId);
    writeStoredPresentation({
      ...stored,
      savedBoards: nextBoards,
    });
    setSavedBoards(nextBoards.filter((board) => board.profileId === profileId));
  }, [profileId]);

  return {
    viewMode,
    setViewMode,
    activeCardId,
    setActiveCardId,
    activePrimaryCardId,
    setActivePrimaryCardId,
    savedBoards,
    saveCurrentBoard,
    restoreBoard,
    deleteBoard,
  };
}
