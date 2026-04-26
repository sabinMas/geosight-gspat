"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bookmark, ExternalLink, MapPin, Trash2 } from "lucide-react";
import { getLensLabel, normalizeProfileId } from "@/lib/lenses";
import { SavedSite } from "@/types";

const STORAGE_KEY = "geosight.saved-sites";

function useAllSavedSites() {
  const [sites, setSites] = useState<SavedSite[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      const parsed: SavedSite[] = stored ? (JSON.parse(stored) as SavedSite[]) : [];
      setSites(parsed);
    } catch {
      setSites([]);
    }
    setReady(true);
  }, []);

  const removeSite = useCallback((id: string) => {
    setSites((prev) => {
      const next = prev.filter((s) => s.id !== id);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return { sites, removeSite, ready };
}

function profileLabel(profileId: string): string {
  const normalized = normalizeProfileId(profileId) ?? profileId;
  return getLensLabel(normalized) || normalized;
}

function exploreHref(site: SavedSite): string {
  const params = new URLSearchParams({
    lat: site.coordinates.lat.toFixed(6),
    lng: site.coordinates.lng.toFixed(6),
    location: site.regionName,
    profile: normalizeProfileId(site.profileId) ?? site.profileId,
  });
  return `/explore?${params.toString()}`;
}

function ScorePill({ score }: { score: number }) {
  return (
    <span className="shrink-0 rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-soft)] px-2.5 py-0.5 text-xs font-semibold tabular-nums text-[var(--foreground)] cursor-default pointer-events-none select-none">
      {Math.round(score)}/100
    </span>
  );
}

export default function SavedSitesPage() {
  const { sites, removeSite, ready } = useAllSavedSites();

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-10 text-[var(--foreground)] sm:px-8">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <Link
              href="/"
              className="mb-4 inline-flex items-center gap-1.5 text-xs text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              GeoSight
            </Link>
            <div className="eyebrow mt-2">Workspace</div>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">Saved Sites</h1>
          </div>
          <Link
            href="/explore"
            className="shrink-0 inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-foreground)] transition-opacity hover:opacity-90"
          >
            <MapPin className="h-3.5 w-3.5" />
            Explore
          </Link>
        </div>

        {/* Content */}
        {!ready ? (
          <div className="flex items-center justify-center py-24">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[color:var(--border-soft)] border-t-[var(--accent)]" />
          </div>
        ) : sites.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-[color:var(--border-soft)] bg-[var(--surface-raised)] px-8 py-16 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-soft)]">
              <Bookmark className="h-5 w-5 text-[var(--muted-foreground)]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--foreground)]">No saved sites yet</p>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                Search a location and click Save site to build your library.
              </p>
            </div>
            <Link
              href="/explore"
              className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-foreground)] transition-opacity hover:opacity-90"
            >
              Start exploring
            </Link>
          </div>
        ) : (
          <ul className="space-y-2">
            {sites.map((site) => (
              <li
                key={site.id}
                className="flex items-center gap-4 rounded-2xl border border-[color:var(--border-soft)] bg-[var(--surface-raised)] px-5 py-4"
              >
                {/* Score */}
                <ScorePill score={site.score.total} />

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[var(--foreground)]">
                    {site.name}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-[var(--muted-foreground)]">
                    {site.regionName}
                    {site.profileId ? (
                      <span className="ml-2 text-[var(--muted-foreground)]">
                        · {profileLabel(site.profileId)}
                      </span>
                    ) : null}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex shrink-0 items-center gap-2">
                  <Link
                    href={exploreHref(site)}
                    title="Open in Explore"
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-soft)] text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                  <button
                    type="button"
                    title="Delete site"
                    onClick={() => removeSite(site.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-soft)] text-[var(--muted-foreground)] transition-colors hover:border-[color:var(--danger-border)] hover:bg-[var(--danger-soft)] hover:text-[var(--danger-foreground)]"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {sites.length > 0 ? (
          <p className="mt-4 text-center text-xs text-[var(--muted-foreground)]">
            {sites.length} {sites.length === 1 ? "site" : "sites"} · stored locally in this browser
          </p>
        ) : null}
      </div>
    </main>
  );
}
