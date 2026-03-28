"use client";

import { useEffect, useState } from "react";
import { WorkspaceCardId, WorkspaceViewMode } from "@/types";

const STORAGE_KEY = "geosight.workspace-presentation.v1";

interface StoredWorkspacePresentation {
  viewMode?: WorkspaceViewMode;
  activeBoardCards?: Record<string, WorkspaceCardId>;
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
  visibleWorkspaceCardIds: WorkspaceCardId[],
) {
  const [viewMode, setViewModeState] = useState<WorkspaceViewMode>("board");
  const [activeCardId, setActiveCardIdState] = useState<WorkspaceCardId | null>(
    visibleWorkspaceCardIds[0] ?? null,
  );

  useEffect(() => {
    const stored = readStoredPresentation();
    setViewModeState(stored.viewMode ?? "board");

    const storedCardId = stored.activeBoardCards?.[profileId];
    if (storedCardId && visibleWorkspaceCardIds.includes(storedCardId)) {
      setActiveCardIdState(storedCardId);
      return;
    }

    setActiveCardIdState(visibleWorkspaceCardIds[0] ?? null);
  }, [profileId, visibleWorkspaceCardIds]);

  const setViewMode = (nextViewMode: WorkspaceViewMode) => {
    setViewModeState(nextViewMode);
    const stored = readStoredPresentation();
    writeStoredPresentation({
      ...stored,
      viewMode: nextViewMode,
      activeBoardCards: stored.activeBoardCards ?? {},
    });
  };

  const setActiveCardId = (nextCardId: WorkspaceCardId) => {
    setActiveCardIdState(nextCardId);
    const stored = readStoredPresentation();
    writeStoredPresentation({
      ...stored,
      viewMode: stored.viewMode ?? viewMode,
      activeBoardCards: {
        ...(stored.activeBoardCards ?? {}),
        [profileId]: nextCardId,
      },
    });
  };

  return {
    viewMode,
    setViewMode,
    activeCardId,
    setActiveCardId,
  };
}
