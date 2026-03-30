import { SourceStatusBadge } from "@/components/Source/SourceStatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GeodataResult } from "@/types";

interface AirQualityCardProps {
  geodata: GeodataResult | null;
}

function getAqiTone(category: NonNullable<GeodataResult["airQuality"]>["aqiCategory"]) {
  switch (category) {
    case "Good":
      return "border-emerald-300/20 bg-emerald-400/10 text-[var(--foreground)]";
    case "Moderate":
      return "border-amber-300/20 bg-amber-400/10 text-[var(--foreground)]";
    case "Unhealthy for Sensitive Groups":
      return "border-orange-300/20 bg-orange-400/10 text-[var(--foreground)]";
    case "Unhealthy":
      return "border-rose-300/20 bg-rose-400/10 text-[var(--foreground)]";
    case "Very Unhealthy":
      return "border-fuchsia-300/20 bg-fuchsia-400/10 text-[var(--foreground)]";
    case "Hazardous":
      return "border-red-300/20 bg-red-500/10 text-[var(--foreground)]";
    default:
      return "border-slate-300/15 bg-slate-400/10 text-[var(--foreground)]";
  }
}

export function AirQualityCard({ geodata }: AirQualityCardProps) {
  if (!geodata) {
    return null;
  }

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
              {geodata.airQuality.aqiCategory}
            </div>
            <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4">
              <div className="eyebrow">Nearest station</div>
              <div className="mt-3 text-lg font-semibold text-[var(--foreground)]">
                {geodata.airQuality.stationName}
              </div>
              <div className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                {`${geodata.airQuality.distanceKm.toFixed(1)} km from the selected point.`}
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
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
            </div>
          </>
        ) : (
          <div className="rounded-[1.5rem] border border-[color:var(--warning-border)] bg-[var(--warning-soft)] p-4 text-sm leading-6 text-[var(--warning-foreground)]">
            {geodata.sources.airQuality.note ??
              (geodata.climate.airQualityIndex === null
                ? "No nearby air-quality station reading is available for this point."
                : `OpenAQ station unavailable; Open-Meteo currently reports AQI ${geodata.climate.airQualityIndex}.`)}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-2 rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-soft)] px-3 py-1.5 text-xs text-[var(--muted-foreground)]">
            <span>OpenAQ</span>
            <SourceStatusBadge source={geodata.sources.airQuality} />
          </div>
          <div className="flex items-center gap-2 rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-soft)] px-3 py-1.5 text-xs text-[var(--muted-foreground)]">
            <span>Open-Meteo AQI</span>
            <SourceStatusBadge source={geodata.sources.climate} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
