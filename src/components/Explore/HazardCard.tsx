import { TrustSummaryPanel } from "@/components/Source/TrustSummaryPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { summarizeSourceTrust } from "@/lib/source-trust";
import { GeodataResult } from "@/types";

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

export function HazardCard({ geodata }: HazardCardProps) {
  const hazards = geodata?.hazards;
  const climate = geodata?.climate;
  const hazardSources = geodata
    ? [geodata.sources.hazards, geodata.sources.hazardFire, geodata.sources.climate]
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

        <TrustSummaryPanel
          summary={trustSummary}
          sources={hazardSources}
          note="Earthquakes and fire detections are live feeds. Weather risk is a GeoSight-derived summary built from the loaded weather codes and forecast context."
        />
      </CardContent>
    </Card>
  );
}
