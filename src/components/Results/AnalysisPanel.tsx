"use client";

import { MapPin, PenSquare, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AnalysisInputMode,
  DrawnGeometryFeatureCollection,
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
  geometry: DrawnGeometryFeatureCollection;
  analysisInputMode: AnalysisInputMode;
  onUseDrawnArea: () => void;
  onUseLocation: () => void;
  analysisResult: LensAnalysisResult | null;
  isLoading: boolean;
  error: string | null;
  children?: React.ReactNode;
}

export function AnalysisPanel({
  lens,
  location,
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
            {location.displayName || location.name || "No place selected yet"}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={analysisInputMode === "location" ? "default" : "secondary"}
              className="rounded-full"
              onClick={onUseLocation}
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
            GeoJSON is now the shared geometry contract for the lens pipeline, exports, and the
            upcoming AI run.
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-3 rounded-[1.4rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4">
            <div className="h-3 w-24 animate-pulse rounded-full bg-[var(--surface-raised)]" />
            <div className="h-3 w-full animate-pulse rounded-full bg-[var(--surface-raised)]" />
            <div className="h-3 w-5/6 animate-pulse rounded-full bg-[var(--surface-raised)]" />
          </div>
        ) : null}

        {!isLoading && error ? (
          <div className="rounded-[1.4rem] border border-[color:var(--danger-border)] bg-[var(--danger-soft)] p-4 text-sm text-[var(--danger-foreground)]">
            {error}
          </div>
        ) : null}

        {analysisResult ? children : null}
      </CardContent>
    </Card>
  );
}
