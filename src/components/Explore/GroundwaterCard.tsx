"use client";

import { SourceStatusBadge } from "@/components/Source/SourceStatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GeodataResult } from "@/types";

interface GroundwaterCardProps {
  geodata: GeodataResult | null;
}

function getDepthBadge(levelFt: number) {
  if (levelFt < 20) {
    return {
      label: "Shallow",
      tone: "border-amber-300/20 bg-amber-400/10 text-amber-50",
    };
  }

  if (levelFt <= 100) {
    return {
      label: "Moderate",
      tone: "border-cyan-300/20 bg-cyan-400/10 text-cyan-50",
    };
  }

  return {
    label: "Deep",
    tone: "border-emerald-300/20 bg-emerald-400/10 text-emerald-50",
  };
}

export function GroundwaterCard({ geodata }: GroundwaterCardProps) {
  if (!geodata) {
    return null;
  }

  const nearestWell = geodata.groundwater.nearestWell;

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="eyebrow">Subsurface hydrology</div>
        <CardTitle>Groundwater levels</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {nearestWell ? (
          <>
            <div
              className={`inline-flex rounded-full border px-3 py-1.5 text-xs uppercase tracking-[0.18em] ${
                nearestWell.currentLevelFt === null
                  ? "border-slate-300/15 bg-slate-400/10 text-slate-100"
                  : getDepthBadge(nearestWell.currentLevelFt).tone
              }`}
            >
              {nearestWell.currentLevelFt === null
                ? "Level unavailable"
                : getDepthBadge(nearestWell.currentLevelFt).label}
            </div>

            <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4">
              <div className="eyebrow">Nearest monitoring well</div>
              <div className="mt-3 text-lg font-semibold text-[var(--foreground)]">
                {nearestWell.siteName}
              </div>
              <div className="mt-3 grid gap-2 text-sm text-[var(--muted-foreground)]">
                <div>
                  Distance:{" "}
                  <span className="text-[var(--foreground)]">
                    {nearestWell.distanceKm.toFixed(1)} km
                  </span>
                </div>
                <div>
                  Water level:{" "}
                  <span className="text-[var(--foreground)]">
                    {nearestWell.currentLevelFt === null
                      ? "Unavailable"
                      : `${nearestWell.currentLevelFt.toFixed(1)} ft below surface`}
                  </span>
                </div>
                <div>
                  Well depth:{" "}
                  <span className="text-[var(--foreground)]">
                    {nearestWell.wellDepthFt === null
                      ? "Unavailable"
                      : `${nearestWell.wellDepthFt.toFixed(0)} ft`}
                  </span>
                </div>
                <div>
                  Last reading:{" "}
                  <span className="text-[var(--foreground)]">
                    {nearestWell.measurementDate
                      ? new Date(nearestWell.measurementDate).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "Unavailable"}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-raised)] p-4 text-sm leading-6 text-[var(--muted-foreground)]">
              {geodata.groundwater.wellCount} nearby monitoring{" "}
              {geodata.groundwater.wellCount === 1 ? "well" : "wells"} were returned in the
              current search box.
            </div>
          </>
        ) : (
          <div className="rounded-[1.5rem] border border-[color:var(--warning-border)] bg-[var(--warning-soft)] p-4 text-sm leading-6 text-[var(--warning-foreground)]">
            No USGS groundwater monitoring wells within range.
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-2 rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-soft)] px-3 py-1.5 text-xs text-[var(--muted-foreground)]">
            <span>USGS groundwater</span>
            <SourceStatusBadge source={geodata.sources.groundwater} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
