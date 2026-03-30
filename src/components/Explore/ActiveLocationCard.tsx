"use client";

import { CapabilityLauncher } from "@/components/Analysis/CapabilityLauncher";
import { SourceInlineSummary } from "@/components/Source/SourceInlineSummary";
import { SourceStatusBadge } from "@/components/Source/SourceStatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  formatSourceStatusLabel,
  getSourceStatusTone,
} from "@/lib/source-metadata";
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
  analysisCapabilities?: AnalysisCapability[];
  capabilityAnalysisLoading?: boolean;
  capabilityAnalysisError?: string | null;
  capabilityAnalysisResult?: AnalysisCapabilityResult | null;
  onRunCapabilityAnalysis?: (analysisId: AnalysisCapabilityId) => void;
  onClearCapabilityAnalysis?: () => void;
}

function StatCard({
  label,
  value,
  detail,
  source,
}: {
  label: string;
  value: string;
  detail: string;
  source?: DataSourceMeta;
}) {
  return (
    <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4 shadow-[var(--shadow-soft)]">
      <div className="flex min-w-0 items-start justify-between gap-2">
        <div className="eyebrow">{label}</div>
        {source ? (
          <span
            className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] uppercase tracking-[0.16em] ${getSourceStatusTone(
              source.status,
            )}`}
          >
            {formatSourceStatusLabel(source.status)}
          </span>
        ) : null}
      </div>
      <div className="mt-3 text-lg font-semibold text-[var(--foreground)]">
        {value}
      </div>
      <div className="mt-1 text-xs text-[var(--muted-foreground)]">{detail}</div>
      {source ? (
        <SourceInlineSummary
          source={source}
          title={`${label} source`}
          compact
          className="mt-3"
        />
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

        <div className="grid gap-3 sm:grid-cols-2">
          <StatCard
            label="Elevation"
            value={
              geodata?.elevationMeters === null || geodata?.elevationMeters === undefined
                ? "--"
                : `${geodata.elevationMeters} m`
            }
            detail="Terrain and buildability context"
            source={geodata?.sources.elevation}
          />
          <StatCard
            label="Nearest water"
            value={
              geodata?.nearestWaterBody.distanceKm === null ||
              geodata?.nearestWaterBody.distanceKm === undefined
                ? "--"
                : formatDistanceKm(geodata.nearestWaterBody.distanceKm)
            }
            detail={geodata?.nearestWaterBody.name ?? "Loading mapped hydrology"}
            source={geodata?.sources.infrastructure}
          />
          <StatCard
            label="Weather now"
            value={
              geodata?.climate.currentTempC === null ||
              geodata?.climate.currentTempC === undefined
                ? "--"
                : `${geodata.climate.currentTempC.toFixed(1)} C`
            }
            detail={`Wind ${geodata?.climate.windSpeedKph?.toFixed(1) ?? "--"} km/h`}
            source={geodata?.sources.climate}
          />
          <StatCard
            label="Air quality"
            value={
              geodata?.climate.airQualityIndex === null ||
              geodata?.climate.airQualityIndex === undefined
                ? "AQI --"
                : `AQI ${geodata.climate.airQualityIndex}`
            }
            detail="Current atmospheric snapshot"
            source={geodata?.sources.climate}
          />
        </div>

        {sourceHighlights.length > 0 ? (
          <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4">
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="eyebrow">Data health</div>
                <div className="mt-2 text-sm text-[var(--muted-foreground)]">
                  Quick trust check for the signals shaping this view.
                </div>
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
            <div className="mt-3 flex flex-wrap gap-2">
              {sourceHighlights.map((source) => (
                <div
                  key={source.id}
                  className="flex items-center gap-2 rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-raised)] px-3 py-1.5 text-xs text-[var(--muted-foreground)]"
                >
                  <span>{source.label}</span>
                  <SourceStatusBadge source={source} />
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {geodata ? (
          <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="eyebrow">Coverage posture</span>
              <span className="rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-raised)] px-3 py-1 text-xs text-[var(--foreground-soft)]">
                {coverageLabel}
              </span>
            </div>
            <div className="mt-3 space-y-2 text-sm leading-6 text-[var(--muted-foreground)]">
              {coverageNotes.map((note) => (
                <p key={note}>{note}</p>
              ))}
            </div>
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
          <div className="rounded-[1.5rem] border border-[color:var(--accent-strong)] bg-[var(--accent-soft)] px-4 py-3 text-sm text-[var(--accent-foreground)]">
            Source details are ready when you want to inspect freshness,
            coverage, and confidence.
          </div>
        ) : null}

        {showCompareCta && onOpenCompare ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.5rem] border border-[color:var(--warning-border)] bg-[var(--warning-soft)] px-4 py-3 text-sm text-[var(--warning-foreground)]">
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
            onRun={onRunCapabilityAnalysis}
            onClear={onClearCapabilityAnalysis}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}
