"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { normalizeProfileId } from "@/lib/lenses";
import {
  getWorkspaceCardsForProfile,
  mergeWorkspacePreferences,
  toWorkspaceCardPreferences,
  WORKSPACE_CARD_MAP,
} from "@/lib/workspace-cards";
import { AppMode, WorkspaceCardId, WorkspaceCardPreference } from "@/types";

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

export function useWorkspaceCards(profileId: string, appMode: AppMode) {
  const normalizedProfileId = normalizeProfileId(profileId) ?? profileId;
  const cards = useMemo(() => getWorkspaceCardsForProfile(normalizedProfileId), [normalizedProfileId]);
  const [visibility, setVisibility] = useState<Record<WorkspaceCardId, boolean>>(
    () => mergeWorkspacePreferences(normalizedProfileId, appMode),
  );
  const [cardOrder, setCardOrder] = useState<WorkspaceCardId[]>(() => readStoredPreferences().globalOrder);

  useEffect(() => {
    const stored = readStoredPreferences();
    const legacyProfileId = normalizedProfileId === "site-development" ? "residential" : profileId;
    const legacyProfilePreferences = preferencesToMap(stored.profiles[legacyProfileId]);
    const profilePreferences = preferencesToMap(stored.profiles[normalizedProfileId]);
    setVisibility(
      mergeWorkspacePreferences(normalizedProfileId, appMode, {
        ...legacyProfilePreferences,
        ...profilePreferences,
      }),
    );
    setCardOrder(stored.globalOrder.length > 0 ? stored.globalOrder : []);
  }, [appMode, normalizedProfileId, profileId]);

  const persist = useCallback(
    (nextVisibility: Record<WorkspaceCardId, boolean>, currentOrder: WorkspaceCardId[]) => {
      const stored = readStoredPreferences();
      const nextState: StoredWorkspaceCardPreferences = {
        globalOrder:
          currentOrder.length > 0
            ? currentOrder
            : stored.globalOrder.length > 0
              ? stored.globalOrder
              : cards.map((card) => card.id),
        profiles: {
          ...stored.profiles,
          [normalizedProfileId]: toWorkspaceCardPreferences(nextVisibility),
        },
      };

      writeStoredPreferences(nextState);
    },
    [cards, normalizedProfileId],
  );

  const setCardVisible = useCallback((cardId: WorkspaceCardId, visible: boolean) => {
    setVisibility((current) => {
      const next = { ...current, [cardId]: visible };
      persist(next, cardOrder);
      return next;
    });
  }, [persist, cardOrder]);

  const reorderCards = useCallback((newOrder: WorkspaceCardId[]) => {
    setCardOrder(newOrder);
    const stored = readStoredPreferences();
    writeStoredPreferences({ ...stored, globalOrder: newOrder });
  }, []);

  const visibleCards = useMemo(() => {
    const filtered = cards.filter((card) => visibility[card.id]);
    if (cardOrder.length === 0) return filtered;
    return [...filtered].sort((a, b) => {
      const ai = cardOrder.indexOf(a.id);
      const bi = cardOrder.indexOf(b.id);
      if (ai === -1 && bi === -1) return 0;
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
  }, [cards, visibility, cardOrder]);

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
    reorderCards,
    cardMap: WORKSPACE_CARD_MAP,
  };
}
