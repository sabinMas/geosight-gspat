"use client";

import { useState } from "react";
import { ArrowRight, ChevronDown, ShieldCheck } from "lucide-react";
import { StateBadge } from "@/components/Status/StatePanel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
}: AnalysisOverviewBannerProps) {
  const [dataGapsOpen, setDataGapsOpen] = useState(false);
  const [trustOpen, setTrustOpen] = useState(false);
  const overview = buildAnalysisOverview({
    geodata,
    score,
    profile,
    locationName,
    loading,
    error,
  });

  return (
    <Card className="overflow-hidden">
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
              What GeoSight is seeing in {locationName}
            </CardTitle>
            <p className="max-w-4xl text-sm leading-7 text-[var(--foreground-soft)]">
              {overview.summary}
            </p>
            <p className="max-w-4xl text-sm leading-6 text-[var(--muted-foreground)]">
              {overview.statusDetail}
            </p>
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

      <CardContent className="space-y-5">
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="rounded-[1.5rem] border border-[color:var(--success-border)] bg-[var(--success-soft)] p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
              Strongest signals
            </div>
            <div className="mt-3 space-y-2 text-sm leading-6 text-[var(--foreground)]">
              {overview.strengths.length > 0 ? (
                overview.strengths.map((item) => <div key={item}>{item}</div>)
              ) : (
                <div>GeoSight will highlight the strongest verified signals once the active location bundle is ready.</div>
              )}
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-[color:var(--warning-border)] bg-[var(--warning-soft)] p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
              Main tradeoffs
            </div>
            <div className="mt-3 space-y-2 text-sm leading-6 text-[var(--foreground)]">
              {overview.watchouts.length > 0 ? (
                overview.watchouts.map((item) => <div key={item}>{item}</div>)
              ) : (
                <div>Any missing or weak factors will be listed here instead of being buried in the UI.</div>
              )}
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-2 text-left"
              onClick={() => setTrustOpen((v) => !v)}
            >
              <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                ⓘ Trust details & next steps
              </div>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-[var(--muted-foreground)] transition-transform duration-200 ${trustOpen ? "rotate-180" : ""}`}
              />
            </button>
            {trustOpen ? (
              <div className="mt-3 space-y-2 text-sm leading-6 text-[var(--foreground-soft)]">
                {overview.trustNotes.map((item) => (
                  <div key={item}>{item}</div>
                ))}
                {overview.nextSteps.map((item) => (
                  <div key={item}>{item}</div>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {overview.dataGaps.length > 0 ? (
          <div className="rounded-[1.5rem] border border-[color:var(--warning-border)] bg-[var(--warning-soft)] px-4 py-3">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-2 text-left"
              onClick={() => setDataGapsOpen((v) => !v)}
            >
              <span className="text-sm text-[var(--warning-foreground)]">
                ⚠ {overview.dataGaps.length} signal{overview.dataGaps.length === 1 ? "" : "s"} could not be confirmed
              </span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-[var(--warning-foreground)] transition-transform duration-200 ${dataGapsOpen ? "rotate-180" : ""}`}
              />
            </button>
            {dataGapsOpen ? (
              <div className="mt-3 space-y-1">
                {overview.dataGaps.map((item) => (
                  <div
                    key={item}
                    className="text-xs italic text-[var(--muted-foreground)]"
                    title="This means the data source returned no result — not that the risk is low or absent."
                  >
                    — {item}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
