"use client";

import { ArrowRight, X } from "lucide-react";
import { StateBadge } from "@/components/Status/StatePanel";
import { Button } from "@/components/ui/button";
import { buildAnalysisOverview } from "@/lib/analysis-summary";
import { Coordinates, GeodataResult, MissionProfile, SiteScore } from "@/types";

interface MapCalloutProps {
  geodata: GeodataResult | null;
  score: SiteScore | null;
  profile: MissionProfile;
  locationName: string;
  loading: boolean;
  pendingCoords?: Coordinates | null;
  onOpenAnalysis: () => void;
  onDismiss: () => void;
  lensLabel?: string;
}

function formatCoord(lat: number, lng: number): string {
  const latDir = lat >= 0 ? "N" : "S";
  const lngDir = lng >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(4)}° ${latDir}, ${Math.abs(lng).toFixed(4)}° ${lngDir}`;
}

export function MapCallout({
  geodata,
  score,
  profile,
  locationName,
  loading,
  pendingCoords,
  onOpenAnalysis,
  onDismiss,
  lensLabel,
}: MapCalloutProps) {
  const displayLabel = lensLabel ?? profile.name;
  const overview = buildAnalysisOverview({
    geodata,
    score,
    profile,
    locationName,
    loading,
    error: null,
  });

  const topStrength = overview.strengths[0] ?? null;
  const topWatchout = overview.watchouts[0] ?? null;

  return (
    <div className="absolute bottom-14 left-4 z-20 w-72 rounded-2xl border border-[color:var(--border-soft)] bg-[var(--background-elevated)] shadow-[var(--shadow-panel)] backdrop-blur-md xl:bottom-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 border-b border-[color:var(--border-soft)] px-4 pt-3 pb-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <StateBadge tone={overview.tone} />
            {score && !loading ? (
              <span className="text-xs font-semibold tabular-nums text-[var(--foreground)]">
                {Math.round(score.total)}/100
              </span>
            ) : null}
          </div>
          <div className="mt-1 truncate text-sm font-semibold text-[var(--foreground)]">
            {loading && !locationName ? "Analyzing…" : locationName}
          </div>
          {loading && !locationName && pendingCoords ? (
            <div className="text-xs text-[var(--muted-foreground)]">
              {formatCoord(pendingCoords.lat, pendingCoords.lng)}
            </div>
          ) : (
            <div className="text-xs text-[var(--muted-foreground)]">{displayLabel}</div>
          )}
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="shrink-0 rounded-full p-1 text-[var(--muted-foreground)] transition hover:bg-[var(--surface-soft)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/40"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Signals */}
      <div className="space-y-1 px-4 py-3">
        {loading && !topStrength && !topWatchout ? (
          <div className="space-y-1.5">
            <div className="h-3.5 w-3/4 animate-pulse rounded-full bg-[var(--surface-soft)]" />
            <div className="h-3.5 w-1/2 animate-pulse rounded-full bg-[var(--surface-soft)]" />
          </div>
        ) : (
          <>
            {topStrength ? (
              <div className="flex items-start gap-2 text-xs leading-5 text-[var(--foreground-soft)]">
                <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-[var(--color-success)]" />
                <span className="line-clamp-2">{topStrength}</span>
              </div>
            ) : null}
            {topWatchout ? (
              <div className="flex items-start gap-2 text-xs leading-5 text-[var(--foreground-soft)]">
                <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-[var(--color-warning)]" />
                <span className="line-clamp-2">{topWatchout}</span>
              </div>
            ) : null}
            {!topStrength && !topWatchout && !loading ? (
              <p className="text-xs text-[var(--muted-foreground)]">{overview.summary}</p>
            ) : null}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-[color:var(--border-soft)] px-3 py-2">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="w-full justify-between rounded-xl text-xs"
          onClick={() => { onOpenAnalysis(); onDismiss(); }}
        >
          Open full analysis
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
