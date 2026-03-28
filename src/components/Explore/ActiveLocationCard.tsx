"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SourceStatusBadge } from "@/components/Source/SourceStatusBadge";
import { GeodataResult, MissionProfile } from "@/types";

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
}

function StatCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">{label}</div>
      <div className="mt-2 text-base font-semibold text-white">{value}</div>
      <div className="mt-1 text-xs text-slate-400">{detail}</div>
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
}: ActiveLocationCardProps) {
  const sourceHighlights = geodata
    ? [geodata.sources.infrastructure, geodata.sources.climate, geodata.sources.demographics]
    : [];

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>Active location</CardTitle>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Focus the map here, then ask GeoSight what matters through the{" "}
              <span style={{ color: profile.accentColor }}>{profile.name}</span> lens.
            </p>
          </div>
          <Button type="button" size="sm" variant="secondary" className="rounded-full" onClick={onSaveSite}>
            Save site
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="text-lg font-semibold text-white">{locationName}</div>
          <div className="mt-1 font-mono text-xs text-slate-400">
            {lat.toFixed(4)}, {lng.toFixed(4)}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <StatCard
            label="Elevation"
            value={geodata?.elevationMeters === null || geodata?.elevationMeters === undefined ? "--" : `${geodata.elevationMeters} m`}
            detail="Terrain and buildability context"
          />
          <StatCard
            label="Nearest water"
            value={geodata?.nearestWaterBody.distanceKm === null || geodata?.nearestWaterBody.distanceKm === undefined ? "--" : `${geodata.nearestWaterBody.distanceKm.toFixed(1)} km`}
            detail={geodata?.nearestWaterBody.name ?? "Loading mapped hydrology"}
          />
          <StatCard
            label="Weather now"
            value={geodata?.climate.currentTempC === null || geodata?.climate.currentTempC === undefined ? "--" : `${geodata.climate.currentTempC.toFixed(1)} C`}
            detail={`Wind ${geodata?.climate.windSpeedKph?.toFixed(1) ?? "--"} km/h`}
          />
          <StatCard
            label="Air quality"
            value={geodata?.climate.airQualityIndex === null || geodata?.climate.airQualityIndex === undefined ? "AQI --" : `AQI ${geodata.climate.airQualityIndex}`}
            detail="Current atmospheric snapshot"
          />
        </div>

        {sourceHighlights.length > 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                  Data health
                </div>
                <div className="mt-1 text-sm text-slate-300">
                  Quick trust check for the live signals shaping this view.
                </div>
              </div>
              <Button type="button" size="sm" variant="ghost" className="rounded-full" onClick={onOpenSources}>
                Open sources
              </Button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {sourceHighlights.map((source) => (
                <div
                  key={source.id}
                  className="flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/45 px-3 py-1.5 text-xs text-slate-300"
                >
                  <span>{source.label}</span>
                  <SourceStatusBadge source={source} />
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {loading ? <p className="text-sm text-slate-400">Fetching geospatial context...</p> : null}
        {error ? <p className="text-sm text-rose-300">{error}</p> : null}

        {showSourceDetailsCta ? (
          <div className="rounded-2xl border border-cyan-300/20 bg-cyan-400/8 px-4 py-3 text-sm text-cyan-50">
            Source details are available when you want to inspect freshness, coverage, and confidence.
          </div>
        ) : null}

        {showCompareCta && onOpenCompare ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-300/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-50">
            <span>You have enough saved sites to compare them side by side.</span>
            <Button type="button" size="sm" variant="amber" className="rounded-full" onClick={onOpenCompare}>
              Open comparison
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
