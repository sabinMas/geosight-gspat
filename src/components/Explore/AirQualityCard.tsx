import { TrustSummaryPanel } from "@/components/Source/TrustSummaryPanel";
import { StatePanel } from "@/components/Status/StatePanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { summarizeSourceTrust } from "@/lib/source-trust";
import { formatDistanceKm } from "@/lib/stream-gauges";
import { GeodataResult } from "@/types";

interface AirQualityCardProps {
  geodata: GeodataResult | null;
}

function getAqiTone(category: NonNullable<GeodataResult["airQuality"]>["aqiCategory"]) {
  switch (category) {
    case "Good":
      return "border-[color:var(--success-border)] bg-[var(--success-soft)] text-[var(--foreground)]";
    case "Moderate":
      return "border-[color:var(--warning-border)] bg-[var(--warning-soft)] text-[var(--warning-foreground)]";
    case "Unhealthy for Sensitive Groups":
      return "border-[color:var(--warning-border)] bg-[var(--warning-soft)] text-[var(--warning-foreground)]";
    case "Unhealthy":
      return "border-[color:var(--danger-border)] bg-[var(--danger-soft)] text-[var(--danger-foreground)]";
    case "Very Unhealthy":
      return "border-[color:var(--danger-border)] bg-[var(--danger-soft)] text-[var(--danger-foreground)]";
    case "Hazardous":
      return "border-[color:var(--danger-border)] bg-[var(--danger-soft)] text-[var(--danger-foreground)]";
    default:
      return "border-[color:var(--border-soft)] bg-[var(--surface-soft)] text-[var(--foreground)]";
  }
}

export function AirQualityCard({ geodata }: AirQualityCardProps) {
  if (!geodata) {
    return null;
  }

  const trustSummary = summarizeSourceTrust(
    [geodata.sources.airQuality, geodata.sources.climate],
    "Air-quality screening",
  );

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="eyebrow">Environmental quality</div>
        <CardTitle>Air quality</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {geodata.airQuality ? (
          <>
            <div className={`inline-flex rounded-full border px-3 py-1.5 text-xs uppercase tracking-[0.18em] ${getAqiTone(geodata.airQuality.aqiCategory)}`}>
              Air quality: {geodata.airQuality.aqiCategory}
            </div>
            <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4">
              <div className="eyebrow">Plain-language summary</div>
              <div className="mt-3 text-lg font-semibold text-[var(--foreground)]">
                {geodata.airQuality.aqiCategory}
              </div>
              <div className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                Nearest monitoring station: {geodata.airQuality.stationName}. {formatDistanceKm(geodata.airQuality.distanceKm, "Distance unavailable")} from the selected point.
              </div>
            </div>

            <details className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4">
              <summary className="cursor-pointer text-sm font-semibold text-[var(--foreground)]">
                Technical details
              </summary>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <div className="eyebrow">PM2.5</div>
                  <div className="mt-2 text-xl font-semibold text-[var(--foreground)]">
                    {geodata.airQuality.pm25 === null ? "--" : `${geodata.airQuality.pm25} ug/m3`}
                  </div>
                </div>
                <div>
                  <div className="eyebrow">PM10</div>
                  <div className="mt-2 text-xl font-semibold text-[var(--foreground)]">
                    {geodata.airQuality.pm10 === null ? "--" : `${geodata.airQuality.pm10} ug/m3`}
                  </div>
                </div>
              </div>
            </details>
          </>
        ) : (
          <StatePanel
            tone={geodata.climate.airQualityIndex === null ? "unavailable" : "partial"}
            eyebrow="Monitoring coverage"
            title={
              geodata.climate.airQualityIndex === null
                ? "No nearby air-quality station reading is available"
                : "Station data is missing, so GeoSight is using a broader AQI estimate"
            }
            description={
              geodata.sources.airQuality.note ??
              (geodata.climate.airQualityIndex === null
                ? "Neither a nearby OpenAQ station nor a usable atmospheric AQI estimate is available for this point."
                : `OpenAQ station data is unavailable, but Open-Meteo currently reports AQI ${geodata.climate.airQualityIndex}.`)
            }
            compact
          />
        )}

        <TrustSummaryPanel
          summary={trustSummary}
          sources={[geodata.sources.airQuality, geodata.sources.climate]}
          note="Nearest-station pollutant values are more direct than the broader AQI estimate. When the station is missing, GeoSight labels the result as a wider atmospheric screen instead of a local monitor reading."
        />
      </CardContent>
    </Card>
  );
}
