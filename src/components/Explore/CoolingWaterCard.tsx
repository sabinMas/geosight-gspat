import { WorkspaceCardShell } from "@/components/Explore/WorkspaceCardShell";
import { TrustSummaryPanel } from "@/components/Source/TrustSummaryPanel";
import { StatePanel } from "@/components/Status/StatePanel";
import { summarizeSourceTrust } from "@/lib/source-trust";
import { formatDistanceKm, getNearestStreamGauge } from "@/lib/stream-gauges";
import { GeodataResult } from "@/types";

interface CoolingWaterCardProps {
  geodata: GeodataResult | null;
}

export function CoolingWaterCard({ geodata }: CoolingWaterCardProps) {
  if (!geodata) {
    return null;
  }

  const nearestGauge = getNearestStreamGauge(geodata);
  const trustSummary = summarizeSourceTrust(
    [geodata.sources.infrastructure, geodata.sources.water],
    "Cooling-water screening",
  );

  return (
    <WorkspaceCardShell eyebrow="Cooling infrastructure" title="Cooling water">
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4">
            <div className="eyebrow">Mapped water access</div>
            <div className="mt-3 text-lg font-semibold text-[var(--foreground)]">
              {geodata.nearestWaterBody.name}
            </div>
              <div className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                {geodata.nearestWaterBody.distanceKm === null
                  ? "Distance unavailable."
                  : `${formatDistanceKm(geodata.nearestWaterBody.distanceKm)} from the selected point.`}
              </div>
          </div>

          <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4">
            <div className="eyebrow">Nearest stream gauge</div>
            {nearestGauge ? (
              <>
                <div className="mt-3 text-lg font-semibold text-[var(--foreground)]">
                  {nearestGauge.siteName}
                </div>
                <div className="mt-2 grid gap-2 text-sm text-[var(--muted-foreground)]">
                  <div>
                    Distance:{" "}
                    <span className="text-[var(--foreground)]">
                      {formatDistanceKm(nearestGauge.distanceKm)}
                    </span>
                  </div>
                  <div>
                    Discharge:{" "}
                    <span className="text-[var(--foreground)]">
                      {nearestGauge.dischargeCfs === null
                        ? "Unavailable"
                        : `${nearestGauge.dischargeCfs.toLocaleString()} cfs`}
                    </span>
                  </div>
                  <div>
                    Drainage area:{" "}
                    <span className="text-[var(--foreground)]">
                      {nearestGauge.drainageAreaSqMi === null
                        ? "Unavailable"
                        : `${nearestGauge.drainageAreaSqMi.toLocaleString()} sq mi`}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <StatePanel
                tone={geodata.sources.water.status === "unavailable" ? "unavailable" : "partial"}
                eyebrow="Hydrology coverage"
                title="No nearby USGS stream gauge was returned"
                description={geodata.sources.water.note ?? "GeoSight found mapped water access, but it could not tie this point to a nearby discharge gauge within the current search radius."}
                compact
              />
            )}
          </div>
        </div>

        <TrustSummaryPanel
          summary={trustSummary}
          sources={[geodata.sources.infrastructure, geodata.sources.water]}
          note="Mapped water proximity comes from OSM-style infrastructure context, while discharge values come from nearby USGS gauges when a suitable station is available."
        />
    </WorkspaceCardShell>
  );
}
