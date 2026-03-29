import { calculateDistanceKm } from "@/lib/nearby-places";
import { EXTERNAL_TIMEOUTS, fetchWithTimeout } from "@/lib/network";
import { Coordinates, GeodataResult } from "@/types";

type UsgsEarthquakeResponse = {
  features?: Array<{
    properties?: {
      mag?: number | null;
    };
    geometry?: {
      coordinates?: [number, number, number?];
    };
  }>;
};

function toIsoDate(date: Date) {
  return date.toISOString();
}

function parseNullableNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export async function fetchEarthquakeSummary(
  coords: Coordinates,
): Promise<GeodataResult["hazards"]> {
  const end = new Date();
  const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

  const response = await fetchWithTimeout(
    `https://earthquake.usgs.gov/fdsnws/event/1/query.geojson?format=geojson&latitude=${coords.lat}&longitude=${coords.lng}&maxradiuskm=250&starttime=${toIsoDate(start)}&endtime=${toIsoDate(end)}&orderby=time`,
    {
      next: { revalidate: 60 * 60 * 6 },
    },
    EXTERNAL_TIMEOUTS.fast,
  );

  if (!response.ok) {
    throw new Error("USGS earthquake lookup failed.");
  }

  const payload = (await response.json()) as UsgsEarthquakeResponse;
  const earthquakes = payload.features ?? [];

  const strongestMagnitude = earthquakes.reduce<number | null>((strongest, feature) => {
    const magnitude = parseNullableNumber(feature.properties?.mag);
    if (magnitude === null) {
      return strongest;
    }

    return strongest === null ? magnitude : Math.max(strongest, magnitude);
  }, null);

  const nearestEarthquakeKm = earthquakes.reduce<number | null>((nearest, feature) => {
    const coordinates = feature.geometry?.coordinates;
    if (!coordinates) {
      return nearest;
    }

    const distanceKm = calculateDistanceKm(coords, {
      lat: coordinates[1],
      lng: coordinates[0],
    });
    return nearest === null ? distanceKm : Math.min(nearest, distanceKm);
  }, null);

  return {
    earthquakeCount30d: earthquakes.length,
    strongestEarthquakeMagnitude30d: strongestMagnitude,
    nearestEarthquakeKm:
      nearestEarthquakeKm === null ? null : Number(nearestEarthquakeKm.toFixed(1)),
  };
}
