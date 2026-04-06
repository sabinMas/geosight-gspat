"use client";

import { TrustSummaryPanel } from "@/components/Source/TrustSummaryPanel";
import { StatePanel } from "@/components/Status/StatePanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { summarizeSourceTrust } from "@/lib/source-trust";
import { formatDistanceKm } from "@/lib/stream-gauges";
import { GeodataResult } from "@/types";

interface GroundwaterCardProps {
  geodata: GeodataResult | null;
}

function getDepthBadge(levelFt: number) {
  if (levelFt < 20) {
    return {
      label: "Shallow",
      tone: "border-[color:var(--warning-border)] bg-[var(--warning-soft)] text-[var(--foreground)]",
    };
  }

  if (levelFt <= 100) {
    return {
      label: "Moderate",
      tone: "border-[color:var(--accent-strong)] bg-[var(--accent-soft)] text-[var(--foreground)]",
    };
  }

  return {
    label: "Deep",
    tone: "border-[color:var(--success-border)] bg-[var(--success-soft)] text-[var(--foreground)]",
  };
}

export function GroundwaterCard({ geodata }: GroundwaterCardProps) {
  if (!geodata) {
    return null;
  }

  const nearestWell = geodata.groundwater.nearestWell;
  const trustSummary = summarizeSourceTrust(
    [geodata.sources.groundwater],
    "Groundwater screening",
  );

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
                  ? "border-[color:var(--border-soft)] bg-[var(--surface-soft)] text-[var(--foreground)]"
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
                    {formatDistanceKm(nearestWell.distanceKm)}
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
          <StatePanel
            tone={geodata.sources.groundwater.status === "unavailable" ? "unavailable" : "partial"}
            eyebrow="Monitoring coverage"
            title="No nearby groundwater monitoring well was returned"
            description={geodata.sources.groundwater.note ?? "GeoSight searched the current groundwater window but did not find a usable monitoring well close enough to summarize here."}
            compact
          />
        )}

        <TrustSummaryPanel
          summary={trustSummary}
          sources={[geodata.sources.groundwater]}
          note="Groundwater values come from nearby USGS monitoring wells, not a direct well on the selected parcel, so distance still matters when interpreting the result."
        />
      </CardContent>
    </Card>
  );
}
