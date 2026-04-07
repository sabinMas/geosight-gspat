"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { normalizeProfileId } from "@/lib/lenses";
import { SavedSite } from "@/types";

const STORAGE_KEY = "geosight.saved-sites";

export function useSavedSites(activeProfileId: string) {
  const normalizedProfileId = normalizeProfileId(activeProfileId) ?? activeProfileId;
  const [allSites, setAllSites] = useState<SavedSite[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
      return;
    }

    try {
      const parsed = (JSON.parse(stored) as SavedSite[]).map((site) => ({
        ...site,
        profileId: normalizeProfileId(site.profileId) ?? site.profileId,
      }));
      setAllSites(parsed);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    } catch {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    }
  }, []);

  const addSite = useCallback((site: SavedSite) => {
    setAllSites((prev) => {
      const next = [site, ...prev.filter((existing) => existing.id !== site.id)];
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const setSitesForProfile = useCallback(
    (nextProfileSites: SavedSite[]) => {
      setAllSites((prev) => {
        const remainingSites = prev.filter((site) => site.profileId !== normalizedProfileId);
        const nextSites = [...nextProfileSites, ...remainingSites];
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSites));
        return nextSites;
      });
    },
    [normalizedProfileId],
  );

  const sites = useMemo(
    () =>
      allSites
        .filter((site) => site.profileId === normalizedProfileId)
        .sort((a, b) => b.score.total - a.score.total),
    [allSites, normalizedProfileId],
  );

  return { sites, addSite, setSites: setSitesForProfile, isSyncing: false };
}
