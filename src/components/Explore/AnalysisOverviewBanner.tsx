"use client";

import { AlertTriangle, ArrowRight, Info, ShieldCheck } from "lucide-react";
import { StateBadge } from "@/components/Status/StatePanel";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { buildAnalysisOverview } from "@/lib/analysis-summary";
import { GeodataResult, MissionProfile, SiteScore } from "@/types";

interface AnalysisOverviewBannerProps {
  geodata: GeodataResult | null;
  score: SiteScore | null;
  profile: MissionProfile;
  locationName: string;
  loading: boolean;
  error: string | null;
  onOpenFactorBreakdown: () => void;
  onOpenSources: () => void;
  compact?: boolean;
}

export function AnalysisOverviewBanner({
  geodata,
  score,
  profile,
  locationName,
  loading,
  error,
  onOpenFactorBreakdown,
  onOpenSources,
  compact,
}: AnalysisOverviewBannerProps) {
  const overview = buildAnalysisOverview({
    geodata,
    score,
    profile,
    locationName,
    loading,
    error,
  });

  if (compact) {
    return (
      <div
        className="flex min-w-0 items-center gap-2"
        role="region"
        aria-label="Analysis overview"
        aria-live="polite"
      >
        <StateBadge tone={overview.tone} className="shrink-0 whitespace-nowrap" />
        <span className="min-w-0 truncate text-sm font-semibold text-[var(--foreground)]">
          {loading ? "Analyzing…" : locationName || "Select a location"}
        </span>
        <span className="hidden shrink-0 cursor-default select-none rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-soft)] px-2 py-0.5 text-xs text-[var(--foreground-soft)] pointer-events-none xl:inline">
          {profile.name}
        </span>
        {!loading && overview.summary ? (
          <span className="hidden min-w-0 truncate text-xs text-[var(--muted-foreground)] xl:block">
            {overview.summary}
          </span>
        ) : null}
        <div className="ml-auto flex shrink-0 items-center gap-1">
          <Button type="button" size="sm" variant="ghost" className="rounded-full" onClick={onOpenFactorBreakdown}>
            Why score
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Button>
          <Button type="button" size="sm" variant="ghost" className="rounded-full" onClick={onOpenSources}>
            <ShieldCheck className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Card className="overflow-hidden" role="region" aria-label="Analysis overview" aria-live="polite">
      <CardHeader className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="eyebrow">Analysis overview</div>
            <div className="flex flex-wrap items-center gap-2">
              <StateBadge tone={overview.tone} />
              <span className="rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-soft)] px-3 py-1 text-xs text-[var(--foreground-soft)] cursor-default pointer-events-none select-none">
                {profile.name}
              </span>
              <span className="text-xs italic text-[var(--muted-foreground)] cursor-default pointer-events-none select-none">
                {overview.confidenceLabel}
              </span>
            </div>
            <CardTitle className="text-xl sm:text-2xl">
              {locationName}
            </CardTitle>
            <p className="max-w-4xl text-sm leading-7 text-[var(--foreground-soft)]">
              {overview.summary}
            </p>
            <div className="flex flex-wrap gap-2">
              {overview.proxyWeight >= 0.3 ? (
                <div className="flex items-center gap-2 rounded-full border border-[color:var(--warning-border)] bg-[var(--warning-soft)] px-3 py-1.5 text-xs text-[var(--warning-foreground)]">
                  <AlertTriangle aria-hidden className="h-3.5 w-3.5 shrink-0" />
                  {Math.round(overview.proxyWeight * 100)}% proxy-estimated — screening only, not direct measurement.
                </div>
              ) : null}
              {overview.dataGaps.length > 0 ? (
                <div className="flex items-center gap-2 rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-soft)] px-3 py-1.5 text-xs text-[var(--muted-foreground)]">
                  <Info aria-hidden className="h-3.5 w-3.5 shrink-0" />
                  {overview.dataGaps.length} signal{overview.dataGaps.length === 1 ? "" : "s"} unavailable — open source awareness for details.
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              className="rounded-full"
              onClick={onOpenFactorBreakdown}
            >
              Why this score
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="rounded-full"
              onClick={onOpenSources}
            >
              <ShieldCheck className="mr-2 h-4 w-4" />
              Check trust signals
            </Button>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}
