"use client";

import { useEffect, useMemo, useState } from "react";
import { PRELOADED_SITES } from "@/lib/demo-data";
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

  const saveSites = (nextSites: SavedSite[]) => {
    setAllSites(nextSites);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSites));
  };

  const addSite = (site: SavedSite) => {
    saveSites([site, ...allSites.filter((existing) => existing.id !== site.id)]);
  };

  const setSitesForProfile = (nextProfileSites: SavedSite[]) => {
    const remainingSites = allSites.filter((site) => site.profileId !== activeProfileId);
    saveSites([...nextProfileSites, ...remainingSites]);
  };

  const loadDemoSites = (demoSites: SavedSite[] = PRELOADED_SITES) => {
    setSitesForProfile(demoSites.filter((site) => site.profileId === activeProfileId));
  };

  const sites = useMemo(
    () =>
      allSites
        .filter((site) => site.profileId === activeProfileId)
        .sort((a, b) => b.score.total - a.score.total),
    [activeProfileId, allSites],
  );

  return { sites, addSite, setSites: setSitesForProfile, loadDemoSites };
}
