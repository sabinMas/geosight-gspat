import { TrustSummaryPanel } from "@/components/Source/TrustSummaryPanel";
import { StatePanel } from "@/components/Status/StatePanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDistanceKm } from "@/lib/stream-gauges";
import { summarizeSourceTrust } from "@/lib/source-trust";
import { GeodataResult, GdacsAlertSummary } from "@/types";

interface HazardCardProps {
  geodata: GeodataResult | null;
}

function HazardMetric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4">
      <div className="eyebrow">{label}</div>
      <div className="mt-3 text-lg font-semibold text-[var(--foreground)]">{value}</div>
      <div className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">{detail}</div>
    </div>
  );
}

function formatAlertDistance(summary: GdacsAlertSummary | null) {
  if (!summary) {
    return "No current alert distance could be calculated.";
  }

  if (summary.totalCurrentAlerts === 0) {
    return "GDACS currently has no active alerts to measure against this point.";
  }

  const nearestDistanceKm = summary.nearestAlert?.distanceKm ?? null;

  return nearestDistanceKm !== null
    ? `Closest current alert is ${formatDistanceKm(nearestDistanceKm)} away.`
    : "A current alert was found, but GDACS did not return coordinates for a distance readout.";
}

export function HazardCard({ geodata }: HazardCardProps) {
  const hazards = geodata?.hazards;
  const climate = geodata?.climate;
  const gdacsAlerts = geodata?.hazardAlerts;
  const hazardSources = geodata
    ? [geodata.sources.hazards, geodata.sources.hazardAlerts, geodata.sources.hazardFire, geodata.sources.climate]
    : [];
  const trustSummary = summarizeSourceTrust(hazardSources, "Hazard screening");

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="eyebrow">Hazard review</div>
        <CardTitle>Hazard context</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 lg:grid-cols-3">
          <HazardMetric
            label="Seismic activity"
            value={
              hazards?.earthquakeCount30d === null || hazards?.earthquakeCount30d === undefined
                ? "Unavailable"
                : `${hazards.earthquakeCount30d} events`
            }
            detail={`Strongest ${
              hazards?.strongestEarthquakeMagnitude30d === null ||
              hazards?.strongestEarthquakeMagnitude30d === undefined
                ? "magnitude unavailable"
                : `M${hazards.strongestEarthquakeMagnitude30d.toFixed(1)}`
            }; nearest ${
              hazards?.nearestEarthquakeKm === null || hazards?.nearestEarthquakeKm === undefined
                ? "distance unavailable"
                : `${hazards.nearestEarthquakeKm.toFixed(1)} km`
            }.`}
          />
          <HazardMetric
            label="Fire activity"
            value={
              hazards?.activeFireCount7d === null || hazards?.activeFireCount7d === undefined
                ? "Unavailable"
                : hazards.activeFireCount7d === 0
                  ? "None detected"
                  : `${hazards.activeFireCount7d} detections`
            }
            detail={`Nearest fire ${
              hazards?.nearestFireKm === null || hazards?.nearestFireKm === undefined
                ? "distance unavailable"
                : `${hazards.nearestFireKm.toFixed(1)} km`
            }.`}
          />
          <HazardMetric
            label="Weather risk"
            value={climate?.weatherRiskSummary ?? "No elevated risk detected"}
            detail="Short-range weather risk summary derived from current and forecast WMO weather codes."
          />
        </div>

        <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4">
          <div className="eyebrow">Global disaster alerts</div>
          {gdacsAlerts ? (
            <>
              <div className="mt-3 text-lg font-semibold text-[var(--foreground)]">
                {gdacsAlerts.elevatedCurrentAlerts > 0
                  ? `GDACS currently reports ${gdacsAlerts.totalCurrentAlerts} active alerts worldwide, including ${gdacsAlerts.elevatedCurrentAlerts} Orange or Red events.`
                  : gdacsAlerts.totalCurrentAlerts > 0
                    ? `GDACS currently reports ${gdacsAlerts.totalCurrentAlerts} active lower-priority alerts worldwide and no Orange or Red escalation.`
                    : "GDACS returned no current active alerts in the latest feed."}
              </div>
              <div className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                {formatAlertDistance(gdacsAlerts)}
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <HazardMetric
                  label="Active alerts"
                  value={`${gdacsAlerts.totalCurrentAlerts}`}
                  detail="Current GDACS alerts that are still marked active in the live feed."
                />
                <HazardMetric
                  label="Elevated alerts"
                  value={`${gdacsAlerts.elevatedCurrentAlerts}`}
                  detail="Orange or Red alerts that deserve closer situational awareness."
                />
                <HazardMetric
                  label="Current escalation"
                  value={
                    gdacsAlerts.redCurrentAlerts > 0
                      ? "Red present"
                      : gdacsAlerts.orangeCurrentAlerts > 0
                        ? "Orange present"
                        : "No escalation"
                  }
                  detail="Highest active GDACS alert level found in the current feed."
                />
              </div>

              {gdacsAlerts.featuredAlerts.length ? (
                <div className="mt-4 grid gap-2">
                  {gdacsAlerts.featuredAlerts.map((alert) => (
                    <div
                      key={`${alert.eventId}-${alert.episodeId}`}
                      className="rounded-[1.25rem] border border-[color:var(--border-soft)] bg-[var(--surface-raised)] p-4"
                    >
                      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-[var(--foreground)]">
                            {alert.alertLevel} {alert.eventLabel}
                          </div>
                          <div className="mt-1 text-sm text-[var(--muted-foreground)]">
                            {alert.country}
                            {alert.distanceKm !== null ? ` - ${formatDistanceKm(alert.distanceKm)}` : ""}
                          </div>
                        </div>
                        <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                          GDACS
                        </div>
                      </div>
                      <div className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                        {alert.description}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </>
          ) : (
            <StatePanel
              tone={
                geodata
                  ? geodata.sources.hazardAlerts.status === "unavailable"
                    ? "unavailable"
                    : "partial"
                  : "unavailable"
              }
              eyebrow="GDACS feed"
              title="Global disaster alerts are not available right now"
              description={
                geodata?.sources.hazardAlerts.note ??
                "GeoSight could not retrieve the GDACS global alert feed for this location, so the current alert picture stays empty instead of being inferred."
              }
              compact
            />
          )}
        </div>

        <div className="rounded-[1.5rem] border border-[color:var(--warning-border)] bg-[var(--warning-soft)] p-4 text-sm leading-6 text-[var(--warning-foreground)]">
          This card surfaces first-pass hazard context from live sources. It is not a full hazard
          risk model and should not be used as the sole basis for safety decisions. For authoritative
          risk assessments, consult FEMA where applicable, local emergency services, or a certified
          hazard analyst.
        </div>

        {geodata?.sources.hazardFire.note ? (
          <div className="rounded-[1.25rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-3 text-sm leading-6 text-[var(--muted-foreground)]">
            {geodata.sources.hazardFire.note}
          </div>
        ) : null}

        {geodata?.sources.hazardAlerts.note ? (
          <div className="rounded-[1.25rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-3 text-sm leading-6 text-[var(--muted-foreground)]">
            {geodata.sources.hazardAlerts.note}
          </div>
        ) : null}

        <TrustSummaryPanel
          summary={trustSummary}
          sources={hazardSources}
          note="Earthquakes, fire detections, and global disaster alerts are live feeds. Weather risk is a GeoSight-derived summary built from the loaded weather codes and forecast context."
        />
      </CardContent>
    </Card>
  );
}
