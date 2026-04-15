"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { CapabilityLauncher } from "@/components/Analysis/CapabilityLauncher";
import { SourceInfoButton } from "@/components/Source/SourceInfoButton";
import { SourceInlineSummary } from "@/components/Source/SourceInlineSummary";
import { SourceStatusBadge } from "@/components/Source/SourceStatusBadge";
import { StateBadge, StatePanel } from "@/components/Status/StatePanel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buildAnalysisOverview } from "@/lib/analysis-summary";
import { formatDistanceKm } from "@/lib/stream-gauges";
import {
  inferSourceRegistryContextFromGeodata,
  summarizeRegistryContext,
} from "@/lib/source-registry";
import {
  AnalysisCapability,
  AnalysisCapabilityId,
  AnalysisCapabilityResult,
  DataSourceMeta,
  GeodataResult,
  MissionProfile,
  SiteScore,
} from "@/types";

interface ActiveLocationCardProps {
  geodata: GeodataResult | null;
  loading: boolean;
  error: string | null;
  locationName: string;
  lat: number;
  lng: number;
  profile: MissionProfile;
  siteScore?: SiteScore | null;
  onSaveSite: () => void;
  onOpenSources: () => void;
  showSourceDetailsCta?: boolean;
  showCompareCta?: boolean;
  onOpenCompare?: () => void;
  analysisCapabilities?: AnalysisCapability[];
  capabilityAnalysisLoading?: boolean;
  capabilityAnalysisError?: string | null;
  capabilityAnalysisResult?: AnalysisCapabilityResult | null;
  onRunCapabilityAnalysis?: (analysisId: AnalysisCapabilityId) => void;
  onClearCapabilityAnalysis?: () => void;
}

interface LocationSignalCardProps {
  label: string;
  value: string;
  detail: string;
  source?: DataSourceMeta;
  unavailable?: boolean;
  className?: string;
}

function LocationSignalCard({
  label,
  value,
  detail,
  source,
  unavailable = false,
  className,
}: LocationSignalCardProps) {
  return (
    <div
      className={`min-w-0 overflow-hidden rounded-xl border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4 shadow-[var(--shadow-soft)] ${className ?? ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 text-xs font-medium uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
          {label}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {source ? <SourceStatusBadge source={source} /> : null}
          {source ? <SourceInfoButton source={source} title={`${label} source`} /> : null}
        </div>
      </div>
      <div className="mt-4 min-w-0 break-words text-[clamp(2rem,3vw,2.75rem)] font-semibold leading-none tracking-tight text-[var(--foreground)]">
        {value}
      </div>
      <div
        className={`mt-2 truncate text-sm ${unavailable ? "text-[var(--warning-foreground)]" : "text-[var(--muted-foreground)]"}`}
        title={detail}
      >
        {detail}
      </div>
      {source ? (
        <div className="mt-1 text-xs text-[var(--muted-foreground)] opacity-70">
          {source.provider}
        </div>
      ) : null}
    </div>
  );
}

export function ActiveLocationCard({
  geodata,
  loading,
  error,
  locationName,
  lat,
  lng,
  profile,
  siteScore = null,
  onSaveSite,
  onOpenSources,
  showSourceDetailsCta = false,
  showCompareCta = false,
  onOpenCompare,
  analysisCapabilities = [],
  capabilityAnalysisLoading = false,
  capabilityAnalysisError = null,
  capabilityAnalysisResult = null,
  onRunCapabilityAnalysis,
  onClearCapabilityAnalysis,
}: ActiveLocationCardProps) {
  const [showUnavailableSignals, setShowUnavailableSignals] = useState(false);
  const [dataGapsOpen, setDataGapsOpen] = useState(false);
  const sourceHighlights = geodata
    ? [
        geodata.sources.infrastructure,
        geodata.sources.climate,
        geodata.sources.demographics,
      ]
    : [];
  const registryContext = inferSourceRegistryContextFromGeodata(geodata);
  const coverageLabel = summarizeRegistryContext(registryContext);
  const overview = buildAnalysisOverview({
    geodata,
    score: siteScore,
    profile,
    locationName,
    loading,
    error,
  });
  const coverageNotes = geodata
    ? [geodata.sources.demographics.confidence, geodata.sources.school.confidence]
    : [];
  const locationSignals = useMemo(
    () => [
      {
        id: "elevation",
        label: "Elevation",
        value:
          geodata?.elevationMeters === null || geodata?.elevationMeters === undefined
            ? "--"
            : `${geodata.elevationMeters} m`,
        detail: "Terrain and buildability context",
        source: geodata?.sources.elevation,
        unavailable: geodata?.elevationMeters === null || geodata?.elevationMeters === undefined,
      },
      {
        id: "weather",
        label: "Weather now",
        value:
          geodata?.climate.currentTempC === null ||
          geodata?.climate.currentTempC === undefined
            ? "--"
            : `${geodata.climate.currentTempC.toFixed(1)} C`,
        detail: `Wind ${geodata?.climate.windSpeedKph?.toFixed(1) ?? "--"} km/h`,
        source: geodata?.sources.climate,
        unavailable:
          geodata?.climate.currentTempC === null || geodata?.climate.currentTempC === undefined,
      },
      {
        id: "air-quality",
        label: "Air quality",
        value:
          geodata?.climate.airQualityIndex === null ||
          geodata?.climate.airQualityIndex === undefined
            ? "AQI --"
            : `AQI ${geodata.climate.airQualityIndex}`,
        detail:
          geodata?.airQuality?.stationName ??
          "Current atmospheric snapshot from loaded climate context",
        source: geodata?.airQuality ? geodata.sources.airQuality : geodata?.sources.climate,
        unavailable:
          geodata?.climate.airQualityIndex === null ||
          geodata?.climate.airQualityIndex === undefined,
      },
      {
        id: "water",
        label: "Nearest water",
        value:
          geodata?.nearestWaterBody.distanceKm === null ||
          geodata?.nearestWaterBody.distanceKm === undefined
            ? "--"
            : formatDistanceKm(geodata.nearestWaterBody.distanceKm),
        detail: geodata?.nearestWaterBody.name ?? "Mapped hydrology unavailable",
        source: geodata?.sources.infrastructure,
        unavailable:
          geodata?.nearestWaterBody.distanceKm === null ||
          geodata?.nearestWaterBody.distanceKm === undefined,
      },
    ],
    [geodata],
  );
  const visibleSignals = locationSignals.filter((signal) => !signal.unavailable);
  const unavailableSignals = locationSignals.filter((signal) => signal.unavailable);
  const signalsToRender =
    visibleSignals.length > 0 ? visibleSignals : showUnavailableSignals ? unavailableSignals : [];
  const primarySignalCards = signalsToRender.slice(0, 4);
  const [elevationSignal, weatherSignal, airQualitySignal, fourthSignal] = primarySignalCards;

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <CardTitle>{locationName}</CardTitle>
          </div>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="rounded-full"
            onClick={onSaveSite}
          >
            Save site
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="font-mono text-xs text-[var(--muted-foreground)]">
          {lat.toFixed(4)}, {lng.toFixed(4)}
        </div>

        <div className="space-y-4">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <StateBadge tone={overview.tone} />
              <span className="rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-raised)] px-3 py-1 text-xs text-[var(--foreground-soft)] cursor-default pointer-events-none select-none">
                {overview.confidenceLabel}
              </span>
              <span className="rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-raised)] px-3 py-1 text-xs text-[var(--foreground-soft)] cursor-default pointer-events-none select-none">
                {coverageLabel}
              </span>
            </div>
            {geodata?.nearestWaterBody.name && geodata.nearestWaterBody.distanceKm !== null && geodata.nearestWaterBody.distanceKm !== undefined ? (
              <p className="text-sm font-semibold text-[var(--foreground)]">
                Nearest feature: {geodata.nearestWaterBody.name} at {formatDistanceKm(geodata.nearestWaterBody.distanceKm)}.
              </p>
            ) : null}
            <p className="max-w-4xl text-sm leading-7 text-[var(--foreground-soft)]">
              {overview.summary}
            </p>
          </div>

          <div className="grid gap-3">
            <div className={`rounded-[1.25rem] border p-3 ${overview.strengths.length > 0 ? "border-[color:var(--success-border)] bg-[var(--success-soft)]" : "border-[color:var(--border-soft)] bg-[var(--surface-soft)]"}`}>
              <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                Strongest signals
              </div>
              <div className="mt-2 space-y-2 text-sm leading-6 text-[var(--foreground)]">
                {overview.strengths.length > 0 ? (
                  overview.strengths.slice(0, 2).map((item) => {
                    const dotIdx = item.indexOf(" · ");
                    const main = dotIdx >= 0 ? item.slice(0, dotIdx) : item;
                    const tag = dotIdx >= 0 ? item.slice(dotIdx + 3) : null;
                    return (
                      <div key={item}>
                        {main}
                        {tag ? <span className="ml-1 text-[var(--muted-foreground)]">· {tag}</span> : null}
                      </div>
                    );
                  })
                ) : (
                  <div className="text-[var(--muted-foreground)]">Strongest verified signals will appear here once the live bundle is ready.</div>
                )}
              </div>
            </div>
            <div className={`rounded-[1.25rem] border p-3 ${overview.watchouts.length > 0 ? "border-[color:var(--warning-border)] bg-[var(--warning-soft)]" : "border-[color:var(--border-soft)] bg-[var(--surface-soft)]"}`}>
              <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                Watch closely
              </div>
              <div className="mt-2 space-y-2 text-sm leading-6 text-[var(--foreground)]">
                {overview.watchouts.length > 0 ? (
                  overview.watchouts.slice(0, 2).map((item) => {
                    const dotIdx = item.indexOf(" · ");
                    const main = dotIdx >= 0 ? item.slice(0, dotIdx) : item;
                    const tag = dotIdx >= 0 ? item.slice(dotIdx + 3) : null;
                    return (
                      <div key={item}>
                        {main}
                        {tag ? <span className="ml-1 text-[var(--muted-foreground)]">· {tag}</span> : null}
                      </div>
                    );
                  })
                ) : (
                  <div className="text-[var(--muted-foreground)]">Weak or unsupported signals will be called out here instead of being buried.</div>
                )}
              </div>
            </div>
            <div className="rounded-[1.25rem] border border-[color:var(--border-soft)] bg-[var(--surface-raised)] p-3">
              <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                Trust notes
              </div>
              <div className="mt-2 space-y-2 text-sm leading-6 text-[var(--foreground-soft)]">
                {overview.trustNotes.slice(0, 2).map((item) => (
                  <div key={item}>{item}</div>
                ))}
              </div>
            </div>
          </div>

          {overview.dataGaps.length > 0 ? (
            <div className="mt-3 rounded-[1.25rem] border border-[color:var(--warning-border)] bg-[var(--warning-soft)] px-4 py-3">
              <button
                type="button"
                className="flex w-full items-center justify-between gap-2 text-left"
                aria-expanded={dataGapsOpen}
                aria-controls="data-gaps-list"
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
                <div id="data-gaps-list" className="mt-3 space-y-1">
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
        </div>

        <div className="grid min-h-0 gap-3 md:grid-cols-2">
          {elevationSignal ? (
            <LocationSignalCard
              key={elevationSignal.id}
              label={elevationSignal.label}
              value={elevationSignal.value}
              detail={elevationSignal.detail}
              source={elevationSignal.source}
              unavailable={elevationSignal.unavailable}
              className="min-h-[132px]"
            />
          ) : null}
          {weatherSignal ? (
            <LocationSignalCard
              key={weatherSignal.id}
              label={weatherSignal.label}
              value={weatherSignal.value}
              detail={weatherSignal.detail}
              source={weatherSignal.source}
              unavailable={weatherSignal.unavailable}
              className="min-h-[132px]"
            />
          ) : null}
          {airQualitySignal ? (
            <LocationSignalCard
              key={airQualitySignal.id}
              label={airQualitySignal.label}
              value={airQualitySignal.value}
              detail={airQualitySignal.detail}
              source={airQualitySignal.source}
              unavailable={airQualitySignal.unavailable}
              className={fourthSignal ? "min-h-[108px]" : "min-h-[108px] md:col-span-2"}
            />
          ) : null}
          {fourthSignal ? (
            <LocationSignalCard
              key={fourthSignal.id}
              label={fourthSignal.label}
              value={fourthSignal.value}
              detail={fourthSignal.detail}
              source={fourthSignal.source}
              unavailable={fourthSignal.unavailable}
              className="min-h-[108px]"
            />
          ) : null}
        </div>

        {unavailableSignals.length > 0 ? (
          <div className="space-y-3">
            <StatePanel
              tone="partial"
              eyebrow="Signal coverage"
              title={`${unavailableSignals.length} quick-read signal${unavailableSignals.length === 1 ? "" : "s"} not available`}
              description="GeoSight keeps missing or unsupported signals visible so you can tell the difference between a real reading and a coverage gap."
              compact
            />
            <button
              type="button"
              className="rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-soft)] px-4 py-2 text-sm text-[var(--foreground)] transition hover:bg-[var(--surface-raised)]"
              onClick={() => setShowUnavailableSignals((current) => !current)}
            >
              {showUnavailableSignals ? "Hide unavailable" : "Show unavailable"}
            </button>
            {showUnavailableSignals ? (
              <div className="grid gap-3 md:grid-cols-2">
                {unavailableSignals.map((signal) => (
                  <LocationSignalCard
                    key={signal.id}
                    label={signal.label}
                    value={signal.value}
                    detail={signal.detail}
                    source={signal.source}
                    unavailable
                  />
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {sourceHighlights.length > 0 || geodata ? (
          <div className="space-y-3 rounded-xl border border-[color:var(--border-soft)] bg-[var(--surface-soft)] px-4 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
                  In-context provenance
                </span>
                <span className="rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-raised)] px-3 py-1 text-xs text-[var(--foreground-soft)]">
                  {coverageLabel}
                </span>
                {sourceHighlights.map((source) => (
                  <SourceStatusBadge key={source.id} source={source} />
                ))}
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="rounded-full"
                onClick={onOpenSources}
              >
                Open full source details
              </Button>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {sourceHighlights.map((source) => (
                <SourceInlineSummary
                  key={`inline-${source.id}`}
                  source={source}
                  compact
                  className="h-full"
                />
              ))}
            </div>
          </div>
        ) : null}

        {loading ? (
          <StatePanel
            tone="loading"
            eyebrow="Location bundle"
            title="Refreshing live geospatial context"
            description="GeoSight is still gathering the latest readings and provider responses for this place."
            compact
          />
        ) : null}
        {error ? (
          <StatePanel
            tone={error.toLowerCase().includes("cached") ? "cached" : "error"}
            eyebrow="Location bundle"
            title={
              error.toLowerCase().includes("cached")
                ? "Showing a recent cached snapshot"
                : "GeoSight hit a live-data issue"
            }
            description={error}
            compact
          />
        ) : null}

        {showSourceDetailsCta ? (
          <div className="rounded-xl border border-[color:var(--accent-strong)] bg-[var(--accent-soft)] px-4 py-3 text-sm text-[var(--accent-foreground)]">
            Source details are ready whenever you want to inspect freshness and coverage.
          </div>
        ) : null}

        {showCompareCta && onOpenCompare ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[color:var(--warning-border)] bg-[var(--warning-soft)] px-4 py-3 text-sm text-[var(--warning-foreground)]">
            <span>You have enough saved sites to compare them side by side.</span>
            <Button
              type="button"
              size="sm"
              variant="amber"
              className="rounded-full"
              onClick={onOpenCompare}
            >
              Open comparison
            </Button>
          </div>
        ) : null}

        {onRunCapabilityAnalysis && onClearCapabilityAnalysis ? (
          <CapabilityLauncher
            capabilities={analysisCapabilities}
            loading={capabilityAnalysisLoading}
            error={capabilityAnalysisError}
            result={capabilityAnalysisResult}
            geodata={geodata}
            onRun={onRunCapabilityAnalysis}
            onClear={onClearCapabilityAnalysis}
          />
        ) : null}

        {coverageNotes.length > 0 ? (
          <div className="space-y-1 text-xs leading-5 text-[var(--muted-foreground)]">
            {coverageNotes.map((note) => (
              <p key={note}>{note}</p>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
