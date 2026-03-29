import { SourceStatusBadge } from "@/components/Source/SourceStatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GeodataResult } from "@/types";

interface CoolingWaterCardProps {
  geodata: GeodataResult | null;
}

export function CoolingWaterCard({ geodata }: CoolingWaterCardProps) {
  if (!geodata) {
    return null;
  }

  const nearestGauge = [...geodata.streamGauges].sort((a, b) => a.distanceKm - b.distanceKm)[0];

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="eyebrow">Cooling infrastructure</div>
        <CardTitle>Cooling water</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4">
            <div className="eyebrow">Mapped water access</div>
            <div className="mt-3 text-lg font-semibold text-[var(--foreground)]">
              {geodata.nearestWaterBody.name}
            </div>
            <div className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
              {geodata.nearestWaterBody.distanceKm === null
                ? "Distance unavailable."
                : `${geodata.nearestWaterBody.distanceKm.toFixed(1)} km from the selected point.`}
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
                      {nearestGauge.distanceKm.toFixed(1)} km
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
              <div className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">
                No nearby USGS discharge gauge was returned within the current search radius.
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-2 rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-soft)] px-3 py-1.5 text-xs text-[var(--muted-foreground)]">
            <span>OSM waterways</span>
            <SourceStatusBadge source={geodata.sources.infrastructure} />
          </div>
          <div className="flex items-center gap-2 rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-soft)] px-3 py-1.5 text-xs text-[var(--muted-foreground)]">
            <span>USGS Water Services</span>
            <SourceStatusBadge source={geodata.sources.water} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
