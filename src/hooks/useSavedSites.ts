"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { SavedSite } from "@/types";

const STORAGE_KEY = "geosight.saved-sites";

export function useSavedSites(activeProfileId: string) {
  const [allSites, setAllSites] = useState<SavedSite[]>([]);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
      return;
    }

    try {
      const parsed = JSON.parse(stored) as SavedSite[];
      setAllSites(parsed);
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

  const setSitesForProfile = useCallback((nextProfileSites: SavedSite[]) => {
    const remainingSites = allSites.filter((site) => site.profileId !== activeProfileId);
    const nextSites = [...nextProfileSites, ...remainingSites];
    setAllSites(nextSites);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSites));
  }, [activeProfileId, allSites]);

  const loadDemoSites = useCallback((demoSites: SavedSite[] = []) => {
    setSitesForProfile(demoSites.filter((site) => site.profileId === activeProfileId));
  }, [activeProfileId, setSitesForProfile]);

  const sites = useMemo(
    () =>
      allSites
        .filter((site) => site.profileId === activeProfileId)
        .sort((a, b) => b.score.total - a.score.total),
    [activeProfileId, allSites],
  );

  return { sites, addSite, setSites: setSitesForProfile, loadDemoSites };
}
