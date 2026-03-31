"use client";

import { fetchLocationSuggestions, resolveLocationFromQuery } from "@/lib/location-search";
import { Coordinates, LocationSearchResult } from "@/types";

export function parseCoordinates(value: string): Coordinates | null {
  const match = value.match(/(-?\d+(\.\d+)?)\s*,\s*(-?\d+(\.\d+)?)/);
  if (!match) {
    return null;
  }

  const lat = Number(match[1]);
  const lng = Number(match[3]);

  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return null;
  }

  return { lat, lng };
}

const QUERY_SANITY_CHECKS: Record<
  string,
  {
    center: Coordinates;
    maxDistanceKm: number;
    retryQuery?: string;
  }
> = {
  "bellevue, wa": {
    center: { lat: 47.614, lng: -122.192 },
    maxDistanceKm: 80,
    retryQuery: "Bellevue, Washington, USA",
  },
  "phoenix, az": {
    center: { lat: 33.4484, lng: -112.074 },
    maxDistanceKm: 80,
    retryQuery: "Phoenix, Arizona, USA",
  },
  "the dalles, or": {
    center: { lat: 45.5946, lng: -121.1787 },
    maxDistanceKm: 80,
    retryQuery: "The Dalles, Oregon, USA",
  },
};

function normalizeQuery(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function distanceKm(a: Coordinates, b: Coordinates) {
  const earthRadiusKm = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;

  const haversine =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  return 2 * earthRadiusKm * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function selectSanityCheckedMatch(query: string, results: LocationSearchResult[]) {
  const sanityCheck = QUERY_SANITY_CHECKS[normalizeQuery(query)];
  if (!sanityCheck || results.length === 0) {
    return results[0] ?? null;
  }

  return (
    results.find(
      (result) =>
        distanceKm(result.coordinates, sanityCheck.center) <= sanityCheck.maxDistanceKm,
    ) ?? null
  );
}

export async function resolveLocationQuery(query: string): Promise<LocationSearchResult> {
  const trimmedQuery = query.trim();
  const coordinates = parseCoordinates(trimmedQuery);

  if (coordinates) {
    return {
      name: `${coordinates.lat.toFixed(4)}, ${coordinates.lng.toFixed(4)}`,
      coordinates,
      kind: "coordinates",
    };
  }

  const matches = await fetchLocationSuggestions(trimmedQuery, undefined, 5);
  const sanityMatch = selectSanityCheckedMatch(trimmedQuery, matches);

  if (sanityMatch) {
    return sanityMatch;
  }

  const retryQuery = QUERY_SANITY_CHECKS[normalizeQuery(trimmedQuery)]?.retryQuery;
  if (retryQuery) {
    const retryMatches = await fetchLocationSuggestions(retryQuery, undefined, 5);
    const retryMatch = selectSanityCheckedMatch(trimmedQuery, retryMatches);
    if (retryMatch) {
      return retryMatch;
    }
  }

  return resolveLocationFromQuery(trimmedQuery);
}

export async function getCurrentCoordinates() {
  return new Promise<Coordinates>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported in this browser."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }),
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          reject(new Error("Location access was denied. Type a place instead."));
          return;
        }

        if (error.code === error.TIMEOUT) {
          reject(new Error("Reading your current location took too long. Type a place instead."));
          return;
        }

        reject(new Error("Unable to read your current location."));
      },
      {
        enableHighAccuracy: true,
        maximumAge: 60_000,
        timeout: 10_000,
      },
    );
  });
}
