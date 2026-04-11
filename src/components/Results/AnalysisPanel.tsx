"use client";

import {
  AlertTriangle,
  ChartArea,
  Flame,
  Gauge,
  LineChart,
  MapPin,
  Mountain,
  PenSquare,
  Route,
  ShieldAlert,
  Sparkles,
  Trees,
  Waves,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AnalysisInputMode,
  AnalysisMetricRow,
  DrawnGeometryFeatureCollection,
  ElevationProfilePoint,
  LensAnalysisResult,
} from "@/types";

interface AnalysisPanelProps {
  lens: {
    id: string;
    label: string;
    tagline: string;
  };
  location: {
    name: string;
    displayName: string;
  };
  hasLocation: boolean;
  geometry: DrawnGeometryFeatureCollection;
  analysisInputMode: AnalysisInputMode;
  onUseDrawnArea: () => void;
  onUseLocation: () => void;
  analysisResult: LensAnalysisResult | null;
  isLoading: boolean;
  error: string | null;
  children?: React.ReactNode;
}

const SUPPORTED_LENSES = new Set(["hunt-planner", "trail-scout", "land-quick-check"]);

const METRIC_ICON_MAP: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  area: ChartArea,
  difficulty: ShieldAlert,
  fire: Flame,
  flood: ShieldAlert,
  grade: Gauge,
  mountain: Mountain,
  road: Route,
  route: Route,
  slope: Gauge,
  trail: Trees,
  water: Waves,
};

function metricRiskTone(riskLevel: AnalysisMetricRow["riskLevel"]) {
  if (riskLevel === "high") {
    return "border-rose-400/30 bg-rose-400/10 text-rose-50";
  }

  if (riskLevel === "moderate") {
    return "border-amber-400/30 bg-amber-400/10 text-amber-50";
  }

  if (riskLevel === "low") {
    return "border-emerald-400/30 bg-emerald-400/10 text-emerald-50";
  }

  return "border-[color:var(--border-soft)] bg-[var(--surface-soft)] text-[var(--muted-foreground)]";
}

function isElevationProfilePointArray(value: unknown): value is ElevationProfilePoint[] {
  return (
    Array.isArray(value) &&
    value.every(
      (candidate) =>
        typeof candidate === "object" &&
        candidate !== null &&
        "distanceKm" in candidate &&
        typeof (candidate as ElevationProfilePoint).distanceKm === "number",
    )
  );
}

function extractElevationProfile(result: LensAnalysisResult | null) {
  const details = result?.details;
  if (!details || typeof details !== "object") {
    return { profile: null, estimated: false };
  }

  const maybeProfile = details.elevationProfile;
  const maybeEstimated = details.elevationProfileEstimated;
  return {
    profile: isElevationProfilePointArray(maybeProfile) ? maybeProfile : null,
    estimated: maybeEstimated === true,
  };
}

function ElevationProfileCard({
  profile,
  estimated,
}: {
  profile: ElevationProfilePoint[];
  estimated: boolean;
}) {
  const elevations = profile
    .map((point) => point.elevation)
    .filter((value): value is number => typeof value === "number");

  if (!elevations.length) {
    return null;
  }

  const minElevation = Math.min(...elevations);
  const maxElevation = Math.max(...elevations);
  const spread = Math.max(maxElevation - minElevation, 1);
  const width = 320;
  const height = 104;
  const linePath = profile
    .map((point, index) => {
      const x = (index / Math.max(profile.length - 1, 1)) * width;
      const elevation = typeof point.elevation === "number" ? point.elevation : minElevation;
      const y = height - ((elevation - minElevation) / spread) * (height - 12) - 6;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <div className="rounded-[1.4rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
        <LineChart className="h-3.5 w-3.5" />
        Elevation profile
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="mt-3 h-28 w-full overflow-visible rounded-2xl bg-[var(--surface-panel)] p-2"
        role="img"
        aria-label="Elevation profile chart"
      >
        <defs>
          <linearGradient id="analysis-elevation-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={`${linePath} L ${width} ${height} L 0 ${height} Z`} fill="url(#analysis-elevation-fill)" />
        <path
          d={linePath}
          fill="none"
          stroke="#22d3ee"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <div className="mt-3 flex items-center justify-between text-xs text-[var(--muted-foreground)]">
        <span>{Math.round(minElevation * 3.28084).toLocaleString()} ft low</span>
        <span>{Math.round(maxElevation * 3.28084).toLocaleString()} ft high</span>
      </div>
      {estimated ? (
        <div className="mt-2 text-xs text-[var(--muted-foreground)]">
          Profile estimated across the AOI because no route line was drawn.
        </div>
      ) : null}
    </div>
  );
}

function MetricCard({ metric }: { metric: AnalysisMetricRow }) {
  const Icon = metric.icon ? METRIC_ICON_MAP[metric.icon] : null;

  return (
    <div className="rounded-[1.2rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-[var(--foreground)]">
          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-panel)]">
            {Icon ? <Icon className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
          </div>
          <div>
            <div className="text-sm font-medium">{metric.label}</div>
            {metric.detail ? (
              <div className="mt-0.5 text-xs leading-5 text-[var(--muted-foreground)]">
                {metric.detail}
              </div>
            ) : null}
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-semibold text-[var(--foreground)]">{metric.value}</div>
          <div className="mt-1 flex items-center justify-end gap-2">
            {metric.estimated ? (
              <span className="rounded-full border border-[color:var(--border-soft)] px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                Estimated
              </span>
            ) : null}
            {metric.riskLevel ? (
              <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] ${metricRiskTone(metric.riskLevel)}`}>
                {metric.riskLevel} risk
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AnalysisPanel({
  lens,
  location,
  hasLocation,
  geometry,
  analysisInputMode,
  onUseDrawnArea,
  onUseLocation,
  analysisResult,
  isLoading,
  error,
  children,
}: AnalysisPanelProps) {
  const featureCount = geometry.features.length;
  const geometrySummary =
    featureCount === 0
      ? "Draw on the map to give this lens an AOI."
      : `${featureCount} GeoJSON feature${featureCount === 1 ? "" : "s"} ready for analysis.`;
  const supportedLens = SUPPORTED_LENSES.has(lens.id);
  const { profile: elevationProfile, estimated: elevationProfileEstimated } =
    extractElevationProfile(analysisResult);
  const showEmptyState =
    !isLoading &&
    !error &&
    !analysisResult &&
    ((analysisInputMode === "geometry" && featureCount === 0) ||
      (analysisInputMode === "location" && !hasLocation));

  return (
    <Card className="overflow-hidden border-[color:var(--border-soft)] bg-[var(--surface-panel)]">
      <CardHeader className="space-y-3">
        <div className="eyebrow">Lens analysis</div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>{lens.label}</CardTitle>
            <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
              {lens.tagline}
            </p>
          </div>
          <div className="rounded-full border border-cyan-300/30 bg-cyan-400/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-cyan-100">
            {analysisInputMode === "geometry" ? "AOI mode" : "Place mode"}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="rounded-[1.4rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
            <MapPin className="h-3.5 w-3.5" />
            Active place
          </div>
          <div className="mt-2 text-sm font-medium text-[var(--foreground)]">
            {hasLocation ? location.displayName || location.name : "No place selected yet"}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={analysisInputMode === "location" ? "default" : "secondary"}
              className="rounded-full"
              onClick={onUseLocation}
              disabled={!hasLocation}
            >
              Use place
            </Button>
            <Button
              type="button"
              size="sm"
              variant={analysisInputMode === "geometry" ? "default" : "secondary"}
              className="rounded-full"
              onClick={onUseDrawnArea}
              disabled={featureCount === 0}
            >
              <PenSquare className="mr-1.5 h-3.5 w-3.5" />
              Use drawn area
            </Button>
          </div>
        </div>

        <div className="rounded-[1.4rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
            <Sparkles className="h-3.5 w-3.5" />
            AOI store
          </div>
          <p className="mt-2 text-sm leading-6 text-[var(--foreground)]">{geometrySummary}</p>
          <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
            GeoJSON is the shared geometry contract for drawing, export, and lens analysis.
          </p>
        </div>

        {!supportedLens && !isLoading ? (
          <div className="rounded-[1.4rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4 text-sm leading-6 text-[var(--muted-foreground)]">
            Real deterministic metrics are live now for Trail Scout, Hunt Planner, and Land Quick-Check.
            This lens is queued for the next batch.
          </div>
        ) : null}

        {showEmptyState ? (
          <div className="rounded-[1.4rem] border border-dashed border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-panel)] text-[var(--muted-foreground)]">
              <PenSquare className="h-5 w-5" />
            </div>
            <div className="mt-4 text-sm font-semibold text-[var(--foreground)]">
              Draw an area or enter a location to begin
            </div>
            <div className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
              GeoSight will turn the active place or AOI into terrain, access, and risk metrics for this lens.
            </div>
          </div>
        ) : null}

        {isLoading ? (
          <div className="space-y-3 rounded-[1.4rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4">
            <div className="h-3 w-24 animate-pulse rounded-full bg-[var(--surface-raised)]" />
            <div className="h-3 w-full animate-pulse rounded-full bg-[var(--surface-raised)]" />
            <div className="h-3 w-5/6 animate-pulse rounded-full bg-[var(--surface-raised)]" />
            <div className="grid gap-3 md:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="h-24 animate-pulse rounded-[1.2rem] bg-[var(--surface-raised)]"
                />
              ))}
            </div>
          </div>
        ) : null}

        {!isLoading && error ? (
          <div className="rounded-[1.4rem] border border-[color:var(--danger-border)] bg-[var(--danger-soft)] p-4 text-sm text-[var(--danger-foreground)]">
            {error}
          </div>
        ) : null}

        {analysisResult ? (
          <>
            <div className="rounded-[1.4rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                <Sparkles className="h-3.5 w-3.5" />
                Narrative
              </div>
              <div className="mt-2 text-base font-semibold text-[var(--foreground)]">
                {analysisResult.title}
              </div>
              <p className="mt-3 text-sm leading-7 text-[var(--foreground)]">
                {analysisResult.narrative ?? "Narrative unavailable for this run."}
              </p>
            </div>

            {elevationProfile ? (
              <ElevationProfileCard
                profile={elevationProfile}
                estimated={elevationProfileEstimated}
              />
            ) : null}

            <div className="grid gap-3">
              {analysisResult.metrics.map((metric) => (
                <MetricCard key={metric.id} metric={metric} />
              ))}
            </div>

            <div className="rounded-[1.2rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] px-4 py-3 text-xs leading-6 text-[var(--muted-foreground)]">
              Powered by {analysisResult.attribution.join(", ")}.
            </div>
          </>
        ) : null}

        {!isLoading && !error && !analysisResult && supportedLens && !showEmptyState ? (
          <div className="rounded-[1.4rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4 text-sm leading-6 text-[var(--muted-foreground)]">
            Select a place or switch to a drawn AOI to generate lens metrics.
          </div>
        ) : null}

        {!isLoading && !error ? children : null}

        <div className="flex items-start gap-2 text-xs text-[var(--muted-foreground)]">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>Powered by NASA FIRMS, USGS, OpenStreetMap, and other live source providers when available.</span>
        </div>
      </CardContent>
    </Card>
  );
}
