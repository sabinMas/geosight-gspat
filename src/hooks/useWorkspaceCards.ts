"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getWorkspaceCardsForProfile,
  mergeWorkspacePreferences,
  toWorkspaceCardPreferences,
  WORKSPACE_CARD_MAP,
} from "@/lib/workspace-cards";
import { WorkspaceCardId, WorkspaceCardPreference } from "@/types";

const STORAGE_KEY = "geosight.workspace-cards.v1";

interface StoredWorkspaceCardPreferences {
  globalOrder: WorkspaceCardId[];
  profiles: Record<string, WorkspaceCardPreference[]>;
}

function readStoredPreferences(): StoredWorkspaceCardPreferences {
  if (typeof window === "undefined") {
    return { globalOrder: [], profiles: {} };
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return { globalOrder: [], profiles: {} };
  }

  try {
    const parsed = JSON.parse(stored) as StoredWorkspaceCardPreferences;
    return {
      globalOrder: parsed.globalOrder ?? [],
      profiles: parsed.profiles ?? {},
    };
  } catch {
    return { globalOrder: [], profiles: {} };
  }
}

function writeStoredPreferences(value: StoredWorkspaceCardPreferences) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
}

function preferencesToMap(preferences: WorkspaceCardPreference[] = []) {
  return preferences.reduce<Partial<Record<WorkspaceCardId, boolean>>>((acc, preference) => {
    acc[preference.cardId] = preference.visible;
    return acc;
  }, {});
}

export function useWorkspaceCards(profileId: string) {
  const cards = useMemo(() => getWorkspaceCardsForProfile(profileId), [profileId]);
  const [visibility, setVisibility] = useState<Record<WorkspaceCardId, boolean>>(
    () => mergeWorkspacePreferences(profileId),
  );

  useEffect(() => {
    const stored = readStoredPreferences();
    const profilePreferences = preferencesToMap(stored.profiles[profileId]);
    setVisibility(mergeWorkspacePreferences(profileId, profilePreferences));
  }, [profileId]);

  const persist = (nextVisibility: Record<WorkspaceCardId, boolean>) => {
    const stored = readStoredPreferences();
    const nextState: StoredWorkspaceCardPreferences = {
      globalOrder:
        stored.globalOrder.length > 0
          ? stored.globalOrder
          : cards.map((card) => card.id),
      profiles: {
        ...stored.profiles,
        [profileId]: toWorkspaceCardPreferences(nextVisibility),
      },
    };

    writeStoredPreferences(nextState);
  };

  const setCardVisible = (cardId: WorkspaceCardId, visible: boolean) => {
    setVisibility((current) => {
      const next = { ...current, [cardId]: visible };
      persist(next);
      return next;
    });
  };

  const visibleCards = useMemo(
    () => cards.filter((card) => visibility[card.id]),
    [cards, visibility],
  );

  const primaryCards = useMemo(
    () => visibleCards.filter((card) => card.zone === "primary"),
    [visibleCards],
  );
  const workspaceCards = useMemo(
    () => visibleCards.filter((card) => card.zone === "workspace"),
    [visibleCards],
  );

  return {
    cards,
    visibility,
    primaryCards,
    workspaceCards,
    isCardVisible: (cardId: WorkspaceCardId) => Boolean(visibility[cardId]),
    setCardVisible,
    showCard: (cardId: WorkspaceCardId) => setCardVisible(cardId, true),
    hideCard: (cardId: WorkspaceCardId) => setCardVisible(cardId, false),
    cardMap: WORKSPACE_CARD_MAP,
  };
}
