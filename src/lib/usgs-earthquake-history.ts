import { EXTERNAL_TIMEOUTS, fetchWithTimeout } from "@/lib/network";
import { calculateDistanceKm } from "@/lib/nearby-places";
import { Coordinates, EarthquakeEvent, EarthquakeHistorySummary } from "@/types";

type UsgsHistoryResponse = {
  features?: Array<{
    properties?: {
      mag?: number | null;
      time?: number | null;
      place?: string | null;
    };
    geometry?: {
      coordinates?: [number, number, number?];
    };
  }>;
};

function toIsoDate(date: Date) {
  return date.toISOString();
}

export async function fetchEarthquakeHistory(
  coords: Coordinates,
  yearsBack = 5,
): Promise<EarthquakeHistorySummary> {
  const end = new Date();
  const start = new Date(end.getTime() - yearsBack * 365.25 * 24 * 60 * 60 * 1000);

  const url =
    `https://earthquake.usgs.gov/fdsnws/event/1/query.geojson` +
    `?format=geojson` +
    `&latitude=${coords.lat}` +
    `&longitude=${coords.lng}` +
    `&maxradiuskm=500` +
    `&minmagnitude=2.5` +
    `&starttime=${toIsoDate(start)}` +
    `&endtime=${toIsoDate(end)}` +
    `&orderby=magnitude` +
    `&limit=500`;

  const response = await fetchWithTimeout(
    url,
    { cache: "no-store" },
    EXTERNAL_TIMEOUTS.standard,
  );

  if (!response.ok) {
    throw new Error(`USGS earthquake history lookup failed: ${response.status}`);
  }

  const payload = (await response.json()) as UsgsHistoryResponse;
  const features = payload.features ?? [];

  const events: EarthquakeEvent[] = [];
  const countByYear: Record<string, number> = {};

  for (const feature of features) {
    const mag = feature.properties?.mag;
    const time = feature.properties?.time;
    const place = feature.properties?.place;
    const featureCoords = feature.geometry?.coordinates;

    if (!featureCoords || typeof mag !== "number" || !Number.isFinite(mag)) {
      continue;
    }

    const eventDate = typeof time === "number" ? new Date(time) : null;
    const year = eventDate ? eventDate.getFullYear().toString() : "unknown";
    countByYear[year] = (countByYear[year] ?? 0) + 1;

    const distanceKm = calculateDistanceKm(coords, {
      lat: featureCoords[1],
      lng: featureCoords[0],
    });

    events.push({
      mag: Number(mag.toFixed(1)),
      depth:
        typeof featureCoords[2] === "number" && Number.isFinite(featureCoords[2])
          ? Number(featureCoords[2].toFixed(1))
          : null,
      distanceKm: Number(distanceKm.toFixed(1)),
      time: eventDate?.toISOString() ?? "",
      place: place ?? "Unknown location",
      lat: featureCoords[1],
      lng: featureCoords[0],
    });
  }

  const maxMag = events.reduce<number | null>(
    (max, e) => (max === null ? e.mag : Math.max(max, e.mag)),
    null,
  );

  return {
    events,
    countByYear,
    maxMag,
    totalCount: events.length,
    yearsSearched: yearsBack,
  };
}
