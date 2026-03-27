"use client";

import { useEffect, useMemo, useState } from "react";
import { PRELOADED_SITES } from "@/lib/demo-data";
import { SavedSite } from "@/types";

const STORAGE_KEY = "geosight.saved-sites";

export function useSavedSites() {
  const [sites, setSites] = useState<SavedSite[]>(PRELOADED_SITES);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(PRELOADED_SITES));
      return;
    }

    try {
      const parsed = JSON.parse(stored) as SavedSite[];
      if (parsed.length) {
        setSites(parsed);
      }
    } catch {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(PRELOADED_SITES));
    }
  }, []);

  const saveSites = (nextSites: SavedSite[]) => {
    setSites(nextSites);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSites));
  };

  const addSite = (site: SavedSite) => {
    saveSites([site, ...sites.filter((existing) => existing.id !== site.id)]);
  };

  const sortedSites = useMemo(
    () => [...sites].sort((a, b) => b.score.total - a.score.total),
    [sites],
  );

  return { sites: sortedSites, addSite, setSites: saveSites };
}
