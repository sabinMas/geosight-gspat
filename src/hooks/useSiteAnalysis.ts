"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalRequestTimeoutError, fetchWithTimeout } from "@/lib/network";
import { calculateProfileScore } from "@/lib/scoring";
import { DEFAULT_GLOBE_VIEW } from "@/lib/starter-regions";
import { Coordinates, GeodataResult, MissionProfile, SiteScore } from "@/types";

const GEODATA_REQUEST_TIMEOUT_MS = 18_000;
const GEODATA_CACHE_TTL_MS = 2 * 60 * 1000;

type GeodataCacheEntry = {
  data: GeodataResult;
  cachedAt: number;
};

const geodataCache = new Map<string, GeodataCacheEntry>();
const geodataRequests = new Map<string, Promise<GeodataResult>>();

function readCachedGeodata(requestKey: string) {
  const cached = geodataCache.get(requestKey);
  if (!cached) {
    return null;
  }

  if (Date.now() - cached.cachedAt > GEODATA_CACHE_TTL_MS) {
    return null;
  }

  return cached.data;
}

function buildGeodataErrorMessage(error: unknown) {
  if (error instanceof ExternalRequestTimeoutError) {
    return "Live location data is taking longer than expected. GeoSight will keep working with partial context where possible.";
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "GeoSight couldn't load this location right now.";
}

async function fetchGeodataForPoint(lat: number, lng: number, requestKey: string) {
  const cached = readCachedGeodata(requestKey);
  if (cached) {
    return cached;
  }

  const existingRequest = geodataRequests.get(requestKey);
  if (existingRequest) {
    return existingRequest;
  }

  const request = (async () => {
    const response = await fetchWithTimeout(
      `/api/geodata?lat=${lat}&lng=${lng}`,
      {},
      GEODATA_REQUEST_TIMEOUT_MS,
    );
    if (!response.ok) {
      throw new Error("GeoSight couldn't load this location right now.");
    }

    const data = (await response.json()) as GeodataResult;
    geodataCache.set(requestKey, {
      data,
      cachedAt: Date.now(),
    });
    return data;
  })();

  geodataRequests.set(requestKey, request);

  try {
    return await request;
  } finally {
    geodataRequests.delete(requestKey);
  }
}

export function useSiteAnalysis(coords: Coordinates, profile: MissionProfile, ready = true) {
  const [geodata, setGeodata] = useState<GeodataResult | null>(null);
  const [score, setScore] = useState<SiteScore | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastRequestKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const isDefaultView =
      coords.lat === DEFAULT_GLOBE_VIEW.lat && coords.lng === DEFAULT_GLOBE_VIEW.lng;
    if (!ready && isDefaultView) {
      lastRequestKeyRef.current = null;
      setGeodata(null);
      setScore(null);
      setLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    const requestKey = `${coords.lat}:${coords.lng}`;
    const isNewLocation = lastRequestKeyRef.current !== requestKey;
    const cachedGeodata = readCachedGeodata(requestKey);
    lastRequestKeyRef.current = requestKey;

    if (cachedGeodata) {
      setGeodata(cachedGeodata);
      setScore(null);
      setLoading(false);
      setError(null);
      return () => {
        controller.abort();
      };
    }

    if (isNewLocation && !cachedGeodata) {
      setGeodata(null);
      setScore(null);
    }
    setLoading(true);
    setError(null);

    async function run() {
      try {
        const data = await fetchGeodataForPoint(coords.lat, coords.lng, requestKey);
        if (!controller.signal.aborted) {
          setGeodata(data);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          const staleGeodata = geodataCache.get(requestKey)?.data ?? null;
          if (staleGeodata) {
            setGeodata(staleGeodata);
            setError("Live refresh timed out. Showing a recent cached location snapshot.");
          } else {
            setError(buildGeodataErrorMessage(err));
          }
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void run();

    return () => {
      controller.abort();
    };
  }, [coords.lat, coords.lng, ready]);

  useEffect(() => {
    if (!geodata) {
      setScore(null);
      return;
    }

    setScore(calculateProfileScore(geodata, profile));
  }, [geodata, profile]);

  return { geodata, score, loading, error };
}
