"use client";

import { useMemo, useState } from "react";
import { CapabilityLauncher } from "@/components/Analysis/CapabilityLauncher";
import { HousingMarketPulse } from "@/components/Explore/HousingMarketPulse";
import { SourceInfoButton } from "@/components/Source/SourceInfoButton";
import { SourceStatusBadge } from "@/components/Source/SourceStatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  HousingMarketResult,
  MissionProfile,
} from "@/types";

interface ActiveLocationCardProps {
  geodata: GeodataResult | null;
  loading: boolean;
  error: string | null;
  locationName: string;
  lat: number;
  lng: number;
  profile: MissionProfile;
  onSaveSite: () => void;
  onOpenSources: () => void;
  showSourceDetailsCta?: boolean;
  showCompareCta?: boolean;
  onOpenCompare?: () => void;
  housingMarket?: HousingMarketResult | null;
  housingMarketLoading?: boolean;
  housingMarketError?: string | null;
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
      className={`rounded-xl border border-neutral-200 bg-[var(--surface-soft)] p-4 shadow-[var(--shadow-soft)] dark:border-neutral-700 ${className ?? ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
          {label}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {source ? <SourceStatusBadge source={source} /> : null}
          {source ? <SourceInfoButton source={source} title={`${label} source`} /> : null}
        </div>
      </div>
      <div className="mt-4 text-4xl font-semibold tracking-tight text-[var(--foreground)]">
        {value}
      </div>
      <div
        className={`mt-2 line-clamp-1 text-sm ${unavailable ? "text-[var(--warning-foreground)]" : "text-[var(--muted-foreground)]"}`}
        title={detail}
      >
        {detail}
      </div>
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
  onSaveSite,
  onOpenSources,
  showSourceDetailsCta = false,
  showCompareCta = false,
  onOpenCompare,
  housingMarket = null,
  housingMarketLoading = false,
  housingMarketError = null,
  analysisCapabilities = [],
  capabilityAnalysisLoading = false,
  capabilityAnalysisError = null,
  capabilityAnalysisResult = null,
  onRunCapabilityAnalysis,
  onClearCapabilityAnalysis,
}: ActiveLocationCardProps) {
  const [showUnavailableSignals, setShowUnavailableSignals] = useState(false);
  const sourceHighlights = geodata
    ? [
        geodata.sources.infrastructure,
        geodata.sources.climate,
        geodata.sources.demographics,
      ]
    : [];
  const registryContext = inferSourceRegistryContextFromGeodata(geodata);
  const coverageLabel = summarizeRegistryContext(registryContext);
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
            <div className="eyebrow">Location summary</div>
            <CardTitle>Active location</CardTitle>
            <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
              Ask what matters here through the{" "}
              <span style={{ color: profile.accentColor }}>{profile.name}</span>{" "}
              lens.
            </p>
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
      <CardContent className="space-y-4">
        <div>
          <div className="text-xl font-semibold text-[var(--foreground)]">
            {locationName}
          </div>
          <div className="mt-1 font-mono text-xs text-[var(--muted-foreground)]">
            {lat.toFixed(4)}, {lng.toFixed(4)}
          </div>
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
              className="h-[110px]"
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
              className="h-[110px]"
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
              className={fourthSignal ? "h-[80px]" : "h-[80px] md:col-span-2"}
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
              className="h-[80px]"
            />
          ) : null}
        </div>

        {unavailableSignals.length > 0 ? (
          <div className="rounded-xl border border-[color:var(--border-soft)] bg-[var(--surface-soft)] px-4 py-3 text-sm text-[var(--muted-foreground)]">
            <button
              type="button"
              className="w-full text-left"
              onClick={() => setShowUnavailableSignals((current) => !current)}
            >
              {unavailableSignals.length} signals unavailable -{" "}
              {showUnavailableSignals ? "hide" : "show"}
            </button>
            {showUnavailableSignals ? (
              <div className="mt-3 grid gap-3 md:grid-cols-2">
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
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[color:var(--border-soft)] bg-[var(--surface-soft)] px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
                Coverage
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
              Open sources
            </Button>
          </div>
        ) : null}

        {loading ? (
          <p className="text-sm text-[var(--muted-foreground)]">
            Fetching geospatial context...
          </p>
        ) : null}
        {error ? (
          <p className="text-sm text-[var(--danger-foreground)]">{error}</p>
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

        {profile.id === "residential" ? (
          <HousingMarketPulse
            locationName={locationName}
            housingMarket={housingMarket}
            loading={housingMarketLoading}
            error={housingMarketError}
          />
        ) : null}

        {onRunCapabilityAnalysis && onClearCapabilityAnalysis ? (
          <CapabilityLauncher
            capabilities={analysisCapabilities}
            loading={capabilityAnalysisLoading}
            error={capabilityAnalysisError}
            result={capabilityAnalysisResult}
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
