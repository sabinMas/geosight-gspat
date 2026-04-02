import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { GeodataResult } from "@/types";

interface TripSummaryCardProps {
  geodata: GeodataResult | null;
  locationName: string;
}

function buildDeterministicSummary(geodata: GeodataResult, locationName: string): string {
  const parts: string[] = [];

  const { elevationMeters, climate, amenities, nearestWaterBody, nearestRoad, floodZone } =
    geodata;

  // Opening
  parts.push(`${locationName} is`);

  if (elevationMeters !== null) {
    if (elevationMeters < 100) {
      parts.push("a low-lying area");
    } else if (elevationMeters < 800) {
      parts.push(`a location at about ${Math.round(elevationMeters)} m elevation`);
    } else {
      parts.push(`a higher-elevation spot at ${Math.round(elevationMeters)} m`);
    }
  } else {
    parts.push("a location");
  }

  if (nearestWaterBody.distanceKm !== null && nearestWaterBody.distanceKm < 3) {
    parts.push(`near ${nearestWaterBody.name}`);
  }

  if (nearestRoad.name && nearestRoad.distanceKm !== null && nearestRoad.distanceKm < 0.5) {
    parts.push(`with road access via ${nearestRoad.name}`);
  }

  const summary = parts.join(" ") + ".";

  const details: string[] = [];

  // Climate snapshot
  if (climate.currentTempC !== null) {
    const temp = Math.round(climate.currentTempC);
    details.push(
      `Current temperature is ${temp}°C${temp < 0 ? " — dress warm" : temp > 30 ? " — hot conditions" : ""}.`,
    );
  }

  // Trails
  if (amenities.trailheadCount !== null && amenities.trailheadCount > 0) {
    details.push(
      `There ${amenities.trailheadCount === 1 ? "is" : "are"} ${amenities.trailheadCount} mapped trailhead${amenities.trailheadCount === 1 ? "" : "s"} nearby.`,
    );
  }

  // Parks
  if (amenities.parkCount !== null && amenities.parkCount > 0) {
    details.push(`${amenities.parkCount} park area${amenities.parkCount === 1 ? "" : "s"} in the vicinity.`);
  }

  // Flood note
  if (floodZone?.isSpecialFloodHazard) {
    details.push("Note: this location is in a mapped flood hazard area.");
  }

  // Weather risk
  if (climate.weatherRiskSummary) {
    details.push(climate.weatherRiskSummary);
  }

  return [summary, ...details].join(" ");
}

export function TripSummaryCard({ geodata, locationName }: TripSummaryCardProps) {
  if (!geodata) {
    return (
      <Card>
        <CardHeader>
          <div className="eyebrow">Explorer view</div>
          <CardTitle>Trip summary</CardTitle>
        </CardHeader>
        <CardContent className="text-sm leading-6 text-[var(--muted-foreground)]">
          Select a location to get a plain-English overview of this place.
        </CardContent>
      </Card>
    );
  }

  const summary = buildDeterministicSummary(geodata, locationName);

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="eyebrow">Explorer view</div>
        <CardTitle>Trip summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm leading-7 text-[var(--foreground)]">{summary}</p>

        {geodata.amenities.foodAndDrinkCount !== null &&
          geodata.amenities.foodAndDrinkCount > 0 && (
            <div className="rounded-[1.35rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4">
              <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                Nearby
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {geodata.amenities.foodAndDrinkCount > 0 && (
                  <span className="rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-raised)] px-3 py-1 text-xs text-[var(--foreground)]">
                    {geodata.amenities.foodAndDrinkCount} food &amp; drink
                  </span>
                )}
                {geodata.amenities.healthcareCount !== null &&
                  geodata.amenities.healthcareCount > 0 && (
                    <span className="rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-raised)] px-3 py-1 text-xs text-[var(--foreground)]">
                      {geodata.amenities.healthcareCount} healthcare
                    </span>
                  )}
                {geodata.amenities.transitStopCount !== null &&
                  geodata.amenities.transitStopCount > 0 && (
                    <span className="rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-raised)] px-3 py-1 text-xs text-[var(--foreground)]">
                      {geodata.amenities.transitStopCount} transit stop
                      {geodata.amenities.transitStopCount === 1 ? "" : "s"}
                    </span>
                  )}
              </div>
            </div>
          )}
      </CardContent>
    </Card>
  );
}
