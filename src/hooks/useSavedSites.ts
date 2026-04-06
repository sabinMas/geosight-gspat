"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { normalizeProfileId } from "@/lib/lenses";
import { SavedSite } from "@/types";
import type { StoredSite } from "@/lib/user-storage";

const STORAGE_KEY = "geosight.saved-sites";

/** Strip geodata before sending to cloud storage to keep the payload small. */
function toStoredSite(site: SavedSite): StoredSite {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { geodata: _geodata, ...rest } = site;
  return rest;
}

async function fetchCloudSites(): Promise<StoredSite[]> {
  try {
    const res = await fetch("/api/user-data?type=saved-sites", { cache: "no-store" });
    if (!res.ok) return [];
    const json = (await res.json()) as { sites: StoredSite[] };
    return json.sites ?? [];
  } catch {
    return [];
  }
}

function syncToCloud(sites: SavedSite[]): void {
  // Fire-and-forget — failures fall back silently to localStorage
  void fetch("/api/user-data", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "saved-sites", sites: sites.map(toStoredSite) }),
  }).catch(() => undefined);
}

export function useSavedSites(activeProfileId: string) {
  const normalizedProfileId = normalizeProfileId(activeProfileId) ?? activeProfileId;
  const [allSites, setAllSites] = useState<SavedSite[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const { status } = useSession();
  const hasSyncedRef = useRef(false);

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

  // On first authenticated session, pull cloud sites and merge (cloud wins)
  useEffect(() => {
    if (status !== "authenticated" || hasSyncedRef.current) return;

    hasSyncedRef.current = true;
    setIsSyncing(true);

    void (async () => {
      const cloudStored = await fetchCloudSites();
      if (cloudStored.length === 0) {
        setIsSyncing(false);
        return;
      }

      // Cloud wins — replace local with cloud data (geodata is dropped in cloud,
      // so we cast StoredSite to SavedSite; geodata is optional after types update)
      const cloudSites = cloudStored as unknown as SavedSite[];
      setAllSites(cloudSites);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cloudSites));
      setIsSyncing(false);
    })();
  }, [status]);

  const addSite = useCallback(
    (site: SavedSite) => {
      setAllSites((prev) => {
        const next = [site, ...prev.filter((existing) => existing.id !== site.id)];
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        if (status === "authenticated") {
          syncToCloud(next);
        }
        return next;
      });
    },
    [status],
  );

  const setSitesForProfile = useCallback(
    (nextProfileSites: SavedSite[]) => {
      setAllSites((prev) => {
        const remainingSites = prev.filter((site) => site.profileId !== normalizedProfileId);
        const nextSites = [...nextProfileSites, ...remainingSites];
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSites));
        if (status === "authenticated") {
          syncToCloud(nextSites);
        }
        return nextSites;
      });
    },
    [normalizedProfileId, status],
  );

  const sites = useMemo(
    () =>
      allSites
        .filter((site) => site.profileId === normalizedProfileId)
        .sort((a, b) => b.score.total - a.score.total),
    [allSites, normalizedProfileId],
  );

  return { sites, addSite, setSites: setSitesForProfile, isSyncing };
}
