import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { GeodataResult } from "@/types";

interface OutdoorFitCardProps {
  geodata: GeodataResult | null;
}

interface FitSignal {
  label: string;
  verdict: string;
  detail: string;
  tone: "positive" | "neutral" | "watch";
}

function toneClasses(tone: FitSignal["tone"]) {
  if (tone === "positive") {
    return "border-[color:var(--accent-strong)] bg-[var(--accent-soft)] text-[var(--accent-foreground)]";
  }
  if (tone === "watch") {
    return "border-[color:var(--warning-border)] bg-[var(--warning-soft)] text-[var(--warning-foreground)]";
  }
  return "border-[color:var(--border-soft)] bg-[var(--surface-soft)] text-[var(--foreground)]";
}

function buildFitSignals(geodata: GeodataResult): FitSignal[] {
  const signals: FitSignal[] = [];
  const { elevationMeters, climate, hazards, amenities, nearestWaterBody, floodZone } = geodata;

  // Elevation
  if (elevationMeters !== null) {
    const elev = elevationMeters;
    signals.push({
      label: "Elevation",
      verdict:
        elev < 300
          ? "Low and accessible"
          : elev < 1500
            ? "Moderate elevation"
            : "High elevation — plan accordingly",
      detail:
        elev < 300
          ? `${Math.round(elev)} m — flat or gentle terrain. Easy going.`
          : elev < 1500
            ? `${Math.round(elev)} m — some climbing involved. Good for active hikers.`
            : `${Math.round(elev)} m — altitude can affect exertion and weather.`,
      tone: elev < 1500 ? "positive" : "watch",
    });
  }

  // Water proximity
  if (nearestWaterBody.distanceKm !== null) {
    const dist = nearestWaterBody.distanceKm;
    signals.push({
      label: "Water nearby",
      verdict: dist < 1 ? "Water very close" : dist < 5 ? "Water within reach" : "Water is distant",
      detail:
        dist < 1
          ? `${nearestWaterBody.name} is less than 1 km away. Useful for camping or scouting.`
          : dist < 5
            ? `${nearestWaterBody.name} is about ${dist.toFixed(1)} km away.`
            : `Nearest water (${nearestWaterBody.name}) is ${dist.toFixed(1)} km away — carry enough.`,
      tone: dist < 5 ? "positive" : "neutral",
    });
  }

  // Trail access
  if (amenities.trailheadCount !== null) {
    const count = amenities.trailheadCount;
    signals.push({
      label: "Trail access",
      verdict:
        count === 0
          ? "No trailheads mapped nearby"
          : count === 1
            ? "One trailhead nearby"
            : `${count} trailheads nearby`,
      detail:
        count === 0
          ? "No marked trailheads found within the search radius. May be off-trail only."
          : `${count} mapped trailhead${count === 1 ? "" : "s"} within the area.`,
      tone: count > 0 ? "positive" : "neutral",
    });
  }

  // Active hazards
  if (hazards.activeFireCount7d !== null) {
    const fires = hazards.activeFireCount7d;
    if (fires > 0) {
      signals.push({
        label: "Active fires",
        verdict: `${fires} active fire${fires === 1 ? "" : "s"} in the past 7 days`,
        detail: `NASA FIRMS detected ${fires} fire detection${fires === 1 ? "" : "s"} nearby. Check local fire maps before heading out.`,
        tone: "watch",
      });
    }
  }

  // Air quality
  if (climate.airQualityIndex !== null) {
    const aqi = climate.airQualityIndex;
    signals.push({
      label: "Air quality",
      verdict:
        aqi <= 50
          ? "Good air quality"
          : aqi <= 100
            ? "Moderate air quality"
            : "Poor air quality — consider timing",
      detail:
        aqi <= 50
          ? "Clean air. Fine for all outdoor activities."
          : aqi <= 100
            ? "Acceptable for most people. Sensitive groups may want to limit long exertion."
            : `AQI ${Math.round(aqi)} — limit prolonged outdoor exertion today.`,
      tone: aqi <= 50 ? "positive" : aqi <= 100 ? "neutral" : "watch",
    });
  }

  // Flood zone
  if (floodZone) {
    if (floodZone.isSpecialFloodHazard) {
      signals.push({
        label: "Flood zone",
        verdict: `${floodZone.label} — high-risk flood area`,
        detail: "This location is inside a Special Flood Hazard Area. Avoid after heavy rain.",
        tone: "watch",
      });
    }
  }

  return signals;
}

export function OutdoorFitCard({ geodata }: OutdoorFitCardProps) {
  if (!geodata) {
    return (
      <Card>
        <CardHeader>
          <div className="eyebrow">Explorer view</div>
          <CardTitle>Outdoor fit</CardTitle>
        </CardHeader>
        <CardContent className="text-sm leading-6 text-[var(--muted-foreground)]">
          Select a location to see the outdoor suitability summary.
        </CardContent>
      </Card>
    );
  }

  const signals = buildFitSignals(geodata);

  const positiveCount = signals.filter((s) => s.tone === "positive").length;
  const watchCount = signals.filter((s) => s.tone === "watch").length;

  const overallVerdict =
    watchCount >= 2
      ? "Some concerns — check the details below"
      : positiveCount >= 3
        ? "Looks good for outdoor use"
        : "Reasonable outdoor potential";

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="eyebrow">Explorer view</div>
        <CardTitle>Outdoor fit</CardTitle>
        <p className="text-sm leading-6 text-[var(--muted-foreground)]">{overallVerdict}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {signals.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)]">
            Not enough data to assess outdoor suitability for this location.
          </p>
        ) : (
          signals.map((signal) => (
            <div
              key={signal.label}
              className={`rounded-[1.35rem] border p-4 ${toneClasses(signal.tone)}`}
            >
              <div className="text-[11px] uppercase tracking-[0.18em] opacity-70">
                {signal.label}
              </div>
              <div className="mt-1 text-sm font-semibold">{signal.verdict}</div>
              <div className="mt-1 text-xs leading-5 opacity-80">{signal.detail}</div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
