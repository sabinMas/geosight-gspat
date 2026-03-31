import { fetchWithTimeout } from "@/lib/network";
import { LocationSearchResult } from "@/types";

export const MIN_LOCATION_SUGGESTION_LENGTH = 3;
export const DEFAULT_LOCATION_SUGGESTION_LIMIT = 5;

export async function readGeocodeError(response: Response) {
  const payload = (await response.json().catch(() => null)) as { error?: string } | null;
  return payload?.error ?? "Unable to search this place.";
}

export async function resolveLocationFromQuery(query: string) {
  const response = await fetchWithTimeout(
    `/api/geocode?q=${encodeURIComponent(query)}`,
    {},
    10_000,
  );

  if (!response.ok) {
    throw new Error(await readGeocodeError(response));
  }

  return (await response.json()) as LocationSearchResult;
}

export async function fetchLocationSuggestions(
  query: string,
  signal?: AbortSignal,
  limit = DEFAULT_LOCATION_SUGGESTION_LIMIT,
) {
  const response = await fetchWithTimeout(
    `/api/geocode?q=${encodeURIComponent(query)}&limit=${limit}`,
    { signal },
    8_000,
  );

  if (!response.ok) {
    throw new Error(await readGeocodeError(response));
  }

  return (await response.json()) as LocationSearchResult[];
}

export async function reverseGeocodeCoordinates(lat: number, lng: number, zoom = 10) {
  const response = await fetchWithTimeout(
    `/api/geocode?lat=${lat}&lng=${lng}&zoom=${zoom}`,
    {},
    8_000,
  );

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as LocationSearchResult;
}
