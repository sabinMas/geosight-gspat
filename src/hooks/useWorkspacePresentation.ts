"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  const storedBoardCardId = stored.activeBoardCards?.[profileId];
  const storedPrimaryCardId = stored.activePrimaryCards?.[profileId];

  return {
    shellMode: stored.shellModes?.[profileId] ?? "minimal",
    viewMode: stored.viewMode ?? "board",
    pinnedCardIds: stored.pinnedCards?.[profileId] ?? [],
    savedBoards: (stored.savedBoards ?? []).filter((board) => board.profileId === profileId),
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
  const [shellMode, setShellModeState] = useState<WorkspaceShellMode>(
    () => getInitialPresentationState(profileId, visibleWorkspaceCardIds, visiblePrimaryCardIds).shellMode,
  );
  const [viewMode, setViewModeState] = useState<WorkspaceViewMode>(
    () => getInitialPresentationState(profileId, visibleWorkspaceCardIds, visiblePrimaryCardIds).viewMode,
  );
  const [activeCardId, setActiveCardIdState] = useState<WorkspaceCardId | null>(
    () => getInitialPresentationState(profileId, visibleWorkspaceCardIds, visiblePrimaryCardIds).activeCardId,
  );
  const [activePrimaryCardId, setActivePrimaryCardIdState] = useState<WorkspaceCardId | null>(
    () =>
      getInitialPresentationState(profileId, visibleWorkspaceCardIds, visiblePrimaryCardIds)
        .activePrimaryCardId,
  );
  const [pinnedCardIds, setPinnedCardIds] = useState<WorkspaceCardId[]>(
    () => getInitialPresentationState(profileId, visibleWorkspaceCardIds, visiblePrimaryCardIds).pinnedCardIds,
  );
  const [savedBoards, setSavedBoards] = useState<SavedBoard[]>(
    () => getInitialPresentationState(profileId, visibleWorkspaceCardIds, visiblePrimaryCardIds).savedBoards,
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
      profileId,
      visibleWorkspaceCardIdsRef.current,
      visiblePrimaryCardIdsRef.current,
    );
    setShellModeState(stored.shellMode);
    setViewModeState(stored.viewMode);
    setPinnedCardIds(stored.pinnedCardIds);
    setSavedBoards(stored.savedBoards);
    setActiveCardIdState(stored.activeCardId);
    setActivePrimaryCardIdState(stored.activePrimaryCardId);
  }, [profileId]);

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
        [profileId]: nextShellMode,
      },
      viewMode: stored.viewMode ?? "board",
      activeBoardCards: stored.activeBoardCards ?? {},
      activePrimaryCards: stored.activePrimaryCards ?? {},
      pinnedCards: stored.pinnedCards ?? {},
      savedBoards: stored.savedBoards ?? [],
    });
  }, [profileId]);

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
        [profileId]: nextCardId,
      },
      activePrimaryCards: stored.activePrimaryCards ?? {},
      pinnedCards: stored.pinnedCards ?? {},
      savedBoards: stored.savedBoards ?? [],
    });
  }, [profileId, viewMode]);

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
        [profileId]: nextCardId,
      },
      pinnedCards: stored.pinnedCards ?? {},
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
      shellModes: stored.shellModes ?? {},
      pinnedCards: stored.pinnedCards ?? {},
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
    setShellModeState("board");
    setViewModeState("board");

    writeStoredPresentation({
      ...stored,
      shellModes: {
        ...(stored.shellModes ?? {}),
        [profileId]: "board",
      },
      viewMode: "board",
      activeBoardCards: restoredActiveCardId
        ? {
            ...(stored.activeBoardCards ?? {}),
            [profileId]: restoredActiveCardId,
          }
        : stored.activeBoardCards ?? {},
      activePrimaryCards: stored.activePrimaryCards ?? {},
      pinnedCards: stored.pinnedCards ?? {},
      savedBoards: stored.savedBoards ?? [],
    });
  }, [allWorkspaceCardIds, profileId, setWorkspaceCardVisible]);

  const deleteBoard = useCallback((boardId: string) => {
    const stored = readStoredPresentation();
    const nextBoards = (stored.savedBoards ?? []).filter((board) => board.id !== boardId);
    writeStoredPresentation({
      ...stored,
      shellModes: stored.shellModes ?? {},
      pinnedCards: stored.pinnedCards ?? {},
      savedBoards: nextBoards,
    });
    setSavedBoards(nextBoards.filter((board) => board.profileId === profileId));
  }, [profileId]);

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
          [profileId]: next,
        },
        savedBoards: stored.savedBoards ?? [],
      });
      return next;
    });
  }, [profileId]);

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
    saveCurrentBoard,
    restoreBoard,
    deleteBoard,
  };
}
