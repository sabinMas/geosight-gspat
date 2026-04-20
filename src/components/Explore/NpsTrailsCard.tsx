"use client";

import { useState } from "react";
import { ExternalLink, Trees } from "lucide-react";
import { WorkspaceCardShell } from "@/components/Explore/WorkspaceCardShell";
import { StatePanel } from "@/components/Status/StatePanel";
import type { NpsPark } from "@/types";

interface NpsTrailsCardProps {
  parks: NpsPark[];
  loading: boolean;
  error: string | null;
  source: "live" | "unavailable" | null;
}

const DESIGNATION_ABBREV: Record<string, string> = {
  "National Park": "NP",
  "National Monument": "NM",
  "National Recreation Area": "NRA",
  "National Forest": "NF",
  "National Wilderness": "NW",
  "National Preserve": "NPRES",
  "National Seashore": "NSS",
  "National Lakeshore": "NLS",
  "National Scenic Trail": "NST",
  "National Historic Trail": "NHT",
  "National Scenic Area": "NSA",
};

function abbrev(designation: string): string {
  return DESIGNATION_ABBREV[designation] ?? designation;
}

function formatDistance(km: number): string {
  if (km < 1) return `${(km * 1000).toFixed(0)} m`;
  return `${km.toFixed(0)} km`;
}

function ParkRow({ park }: { park: NpsPark }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl border border-[color:var(--border-soft)] bg-[var(--surface-soft)]">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-start gap-3 p-3 text-left"
        aria-expanded={expanded}
      >
        {/* Distance badge */}
        <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-raised)]">
          <Trees className="h-4 w-4 text-[var(--accent)]" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-[var(--foreground)]" title={park.name}>
                {park.name}
              </div>
              <div className="mt-0.5 flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
                <span className="cursor-default select-none rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-raised)] px-2 py-0.5 text-xs pointer-events-none">
                  {abbrev(park.designation) || park.designation}
                </span>
                <span>{park.states.replace(/,/g, " · ")}</span>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <div className="text-sm font-semibold tabular-nums text-[var(--foreground)]">
                {formatDistance(park.distanceKm)}
              </div>
              {park.entranceFee && (
                <div className="mt-0.5 text-xs text-[var(--muted-foreground)]">{park.entranceFee}</div>
              )}
            </div>
          </div>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-[color:var(--border-soft)] px-3 pb-3 pt-2.5">
          <p className="text-sm leading-6 text-[var(--foreground-soft)] line-clamp-3">
            {park.description}
          </p>

          {park.activities.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {park.activities.slice(0, 8).map((act) => (
                <span
                  key={act}
                  className="cursor-default select-none rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-raised)] px-2 py-0.5 text-xs text-[var(--muted-foreground)] pointer-events-none"
                >
                  {act}
                </span>
              ))}
            </div>
          )}

          {park.weatherInfo && (
            <p className="mt-2 text-xs leading-5 text-[var(--muted-foreground)] line-clamp-2">
              {park.weatherInfo}
            </p>
          )}

          <div className="mt-3 flex items-center gap-2">
            <a
              href={park.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-raised)] px-3 py-1 text-xs font-medium text-[var(--foreground)] transition hover:border-[color:var(--border-strong)]"
            >
              <ExternalLink className="h-3 w-3" />
              NPS page
            </a>
            {park.directionsInfo && (
              <span className="text-xs text-[var(--muted-foreground)] line-clamp-1">
                {park.directionsInfo.slice(0, 80)}{park.directionsInfo.length > 80 ? "…" : ""}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function NpsTrailsCard({ parks, loading, error, source }: NpsTrailsCardProps) {
  if (loading) {
    return (
      <WorkspaceCardShell eyebrow="NPS trails" title="Nearby national parks & trails" loading />
    );
  }

  if (source === "unavailable" || (error && !parks.length)) {
    return (
      <WorkspaceCardShell eyebrow="NPS trails" title="Nearby national parks & trails">
        <StatePanel
          eyebrow="NPS trails"
          title="NPS data unavailable"
          description={
            error?.includes("NPS_API_KEY")
              ? "Add an NPS_API_KEY environment variable to enable national park data. Keys are free at developer.nps.gov."
              : "National Park Service data could not be loaded for this location."
          }
          tone="unavailable"
        />
      </WorkspaceCardShell>
    );
  }

  if (!parks.length) {
    return (
      <WorkspaceCardShell eyebrow="NPS trails" title="Nearby national parks & trails">
        <StatePanel
          eyebrow="NPS trails"
          title="No NPS parks nearby"
          description="No National Park Service units with hiking were found within 200 km. Try a location closer to a national park or forest."
          tone="partial"
        />
      </WorkspaceCardShell>
    );
  }

  return (
    <WorkspaceCardShell
      eyebrow="NPS trails"
      title="Nearby national parks & trails"
      subtitle={`${parks.length} NPS unit${parks.length === 1 ? "" : "s"} with hiking within 200 km — sorted by distance`}
    >
      <div className="space-y-2">
        {parks.slice(0, 12).map((park) => (
          <ParkRow key={park.id} park={park} />
        ))}
        {parks.length > 12 && (
          <p className="px-1 text-xs text-[var(--muted-foreground)]">
            +{parks.length - 12} more parks within range
          </p>
        )}
      </div>
      <div className="mt-3 text-xs text-[var(--muted-foreground)]">
        Source: US National Park Service API · Hiking parks within 200 km
      </div>
    </WorkspaceCardShell>
  );
}
