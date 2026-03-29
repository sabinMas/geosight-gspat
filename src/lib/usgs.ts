import {
  Coordinates,
  ElevationProfilePoint,
  ElevationProfileSummary,
} from "@/types";
import { buildElevationTransect } from "@/lib/geospatial";
import { EXTERNAL_TIMEOUTS, fetchWithTimeout } from "@/lib/network";

export async function fetchElevation(coords: Coordinates) {
  const url = `https://epqs.nationalmap.gov/v1/json?x=${coords.lng}&y=${coords.lat}&units=Meters&wkid=4326&includeDate=false`;
  const response = await fetchWithTimeout(url, {
    next: { revalidate: 60 * 60 * 6 },
  }, EXTERNAL_TIMEOUTS.fast);

  if (!response.ok) {
    throw new Error("USGS elevation request failed.");
  }

  const data = (await response.json()) as { value?: number };
  return typeof data.value === "number" ? data.value : null;
}

function buildElevationSummary(profile: ElevationProfilePoint[]): ElevationProfileSummary {
  const values = profile
    .map((point) => point.elevation)
    .filter((value): value is number => typeof value === "number");

  if (!values.length) {
    return {
      lengthKm: profile.at(-1)?.distanceKm ?? 0,
      minElevation: null,
      maxElevation: null,
      elevationGain: null,
      elevationLoss: null,
    };
  }

  let gain = 0;
  let loss = 0;

  for (let index = 1; index < profile.length; index += 1) {
    const previous = profile[index - 1]?.elevation;
    const current = profile[index]?.elevation;

    if (typeof previous !== "number" || typeof current !== "number") {
      continue;
    }

    const delta = current - previous;
    if (delta > 0) {
      gain += delta;
    } else if (delta < 0) {
      loss += Math.abs(delta);
    }
  }

  return {
    lengthKm: profile.at(-1)?.distanceKm ?? 0,
    minElevation: Math.round(Math.min(...values)),
    maxElevation: Math.round(Math.max(...values)),
    elevationGain: Math.round(gain),
    elevationLoss: Math.round(loss),
  };
}

export async function fetchElevationProfile(
  center: Coordinates,
  options?: {
    lengthKm?: number;
    samples?: number;
    bearing?: number;
  },
) {
  const profile = buildElevationTransect(
    center,
    options?.lengthKm ?? 12,
    options?.samples ?? 9,
    options?.bearing ?? 90,
  );

  const elevations = await Promise.all(
    profile.map((point) => fetchElevation(point.coordinates).catch(() => null)),
  );

  const resolvedProfile = profile.map((point, index) => ({
    ...point,
    elevation: elevations[index],
  }));

  return {
    profile: resolvedProfile,
    summary: buildElevationSummary(resolvedProfile),
  };
}
