import { Coordinates } from "@/types";
import { calculateDistanceKm } from "@/lib/nearby-places";

interface EarthquakeFeature {
  geometry?: {
    coordinates?: [number, number, number?];
  };
  properties?: {
    mag?: number | null;
  };
}

interface EarthquakeResponse {
  features?: EarthquakeFeature[];
}

export async function fetchEarthquakeSummary({ lat, lng }: Coordinates) {
  const end = new Date();
  const start = new Date(end);
  start.setDate(end.getDate() - 30);

  const params = new URLSearchParams({
    format: "geojson",
    starttime: start.toISOString().slice(0, 10),
    endtime: end.toISOString().slice(0, 10),
    latitude: lat.toFixed(4),
    longitude: lng.toFixed(4),
    maxradiuskm: "250",
    orderby: "time",
  });

  const response = await fetch(
    `https://earthquake.usgs.gov/fdsnws/event/1/query?${params.toString()}`,
    { next: { revalidate: 60 * 60 * 6 } },
  );

  if (!response.ok) {
    throw new Error("USGS earthquake request failed.");
  }

  const data = (await response.json()) as EarthquakeResponse;
  const features = data.features ?? [];

  const nearestDistance = features
    .map((feature) => {
      const coords = feature.geometry?.coordinates;
      if (!coords) {
        return null;
      }

      return calculateDistanceKm({ lat, lng }, { lat: coords[1], lng: coords[0] });
    })
    .filter((distance): distance is number => distance !== null)
    .sort((a, b) => a - b)[0];

  const strongestMagnitude = features
    .map((feature) => feature.properties?.mag ?? null)
    .filter((magnitude): magnitude is number => magnitude !== null)
    .sort((a, b) => b - a)[0];

  return {
    earthquakeCount30d: features.length,
    strongestEarthquakeMagnitude30d:
      strongestMagnitude === undefined ? null : Number(strongestMagnitude.toFixed(2)),
    nearestEarthquakeKm:
      nearestDistance === undefined ? null : Number(nearestDistance.toFixed(1)),
  };
}
