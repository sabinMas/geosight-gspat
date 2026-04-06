"use client";

import { Footprints, MapPin, Thermometer, Trees, Wind } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { GeodataResult } from "@/types";

interface TripSummaryCardProps {
  geodata: GeodataResult | null;
  locationName: string;
}

function ConditionPill({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-[color:var(--border-soft)] bg-[var(--surface-raised)] px-3 py-2">
      <Icon className="h-3.5 w-3.5 shrink-0 text-[var(--muted-foreground)]" />
      <div>
        <div className="text-xs uppercase tracking-[0.14em] text-[var(--muted-foreground)]">{label}</div>
        <div className="text-xs font-semibold text-[var(--foreground)]">{value}</div>
      </div>
    </div>
  );
}

function buildTerrainNote(geodata: GeodataResult): string {
  const { elevationMeters, nearestWaterBody, nearestRoad } = geodata;

  const parts: string[] = [];

  if (elevationMeters !== null) {
    if (elevationMeters < 100) parts.push("low-lying terrain");
    else if (elevationMeters < 800) parts.push(`${Math.round(elevationMeters)} m elevation`);
    else parts.push(`high elevation at ${Math.round(elevationMeters)} m`);
  }

  if (nearestWaterBody.distanceKm !== null && nearestWaterBody.distanceKm < 5) {
    parts.push(`${nearestWaterBody.name} within ${nearestWaterBody.distanceKm.toFixed(1)} km`);
  }

  if (nearestRoad.name && nearestRoad.distanceKm !== null && nearestRoad.distanceKm < 1) {
    parts.push(`road access via ${nearestRoad.name}`);
  }

  return parts.length > 0 ? parts.join(" · ") : "Terrain and access data pending.";
}

export function TripSummaryCard({ geodata, locationName }: TripSummaryCardProps) {
  if (!geodata) {
    return (
      <Card>
        <CardHeader>
          <div className="eyebrow">Trip overview</div>
          <CardTitle>Trip summary</CardTitle>
        </CardHeader>
        <CardContent className="text-sm leading-6 text-[var(--muted-foreground)]">
          Select a location to see the access and conditions overview.
        </CardContent>
      </Card>
    );
  }

  const { climate, amenities, floodZone } = geodata;
  const terrainNote = buildTerrainNote(geodata);

  const hasConditions =
    climate.currentTempC !== null ||
    climate.windSpeedKph !== null ||
    climate.airQualityIndex !== null;

  const trailCount = amenities.trailheadCount ?? 0;
  const parkCount = amenities.parkCount ?? 0;
  const foodCount = amenities.foodAndDrinkCount ?? 0;
  const transitCount = amenities.transitStopCount ?? 0;

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="eyebrow">Trip overview</div>
        <CardTitle>{locationName}</CardTitle>
        <p className="text-xs text-[var(--muted-foreground)]">{terrainNote}</p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Current conditions */}
        {hasConditions ? (
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
              Current conditions
            </div>
            <div className="flex flex-wrap gap-2">
              {climate.currentTempC !== null ? (
                <ConditionPill
                  icon={Thermometer}
                  label="Temp"
                  value={`${Math.round(climate.currentTempC)}°C`}
                />
              ) : null}
              {climate.windSpeedKph !== null ? (
                <ConditionPill
                  icon={Wind}
                  label="Wind"
                  value={`${Math.round(climate.windSpeedKph)} km/h`}
                />
              ) : null}
              {climate.airQualityIndex !== null ? (
                <ConditionPill
                  icon={Thermometer}
                  label="AQI"
                  value={
                    climate.airQualityIndex <= 50
                      ? `${Math.round(climate.airQualityIndex)} · Good`
                      : climate.airQualityIndex <= 100
                        ? `${Math.round(climate.airQualityIndex)} · Moderate`
                        : `${Math.round(climate.airQualityIndex)} · Poor`
                  }
                />
              ) : null}
            </div>
            {climate.weatherRiskSummary ? (
              <p className="text-xs leading-5 text-[var(--muted-foreground)]">
                {climate.weatherRiskSummary}
              </p>
            ) : null}
          </div>
        ) : null}

        {/* Access & amenities */}
        <div className="space-y-2">
          <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
            Nearby (OpenStreetMap)
          </div>
          <div className="flex flex-wrap gap-2">
            {trailCount > 0 ? (
              <span className="flex items-center gap-1.5 rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-raised)] px-3 py-1 text-xs text-[var(--foreground)] cursor-default pointer-events-none select-none">
                <Footprints className="h-3 w-3 shrink-0" />
                {trailCount} trail{trailCount === 1 ? "" : "s"}
              </span>
            ) : null}
            {parkCount > 0 ? (
              <span className="flex items-center gap-1.5 rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-raised)] px-3 py-1 text-xs text-[var(--foreground)] cursor-default pointer-events-none select-none">
                <Trees className="h-3 w-3 shrink-0" />
                {parkCount} park{parkCount === 1 ? "" : "s"}
              </span>
            ) : null}
            {foodCount > 0 ? (
              <span className="flex items-center gap-1.5 rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-raised)] px-3 py-1 text-xs text-[var(--foreground)] cursor-default pointer-events-none select-none">
                <MapPin className="h-3 w-3 shrink-0" />
                {foodCount} food &amp; drink
              </span>
            ) : null}
            {transitCount > 0 ? (
              <span className="flex items-center gap-1.5 rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-raised)] px-3 py-1 text-xs text-[var(--foreground)] cursor-default pointer-events-none select-none">
                <MapPin className="h-3 w-3 shrink-0" />
                {transitCount} transit stop{transitCount === 1 ? "" : "s"}
              </span>
            ) : null}
            {trailCount === 0 && parkCount === 0 && foodCount === 0 && transitCount === 0 ? (
              <span className="text-xs text-[var(--muted-foreground)]">No amenities mapped nearby yet.</span>
            ) : null}
          </div>
        </div>

        {/* Flood note */}
        {floodZone?.isSpecialFloodHazard ? (
          <div className="rounded-[1.5rem] border border-[color:var(--warning-border)] bg-[var(--warning-soft)] px-4 py-3 text-xs leading-5 text-[var(--warning-foreground)]">
            This location is in a mapped flood hazard area ({floodZone.label}). Check local conditions before visiting after rain.
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
