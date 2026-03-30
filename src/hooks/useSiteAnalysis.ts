"use client";

import { useEffect, useRef, useState } from "react";
import { DEFAULT_VIEW } from "@/lib/demo-data";
import { ExternalRequestTimeoutError, fetchWithTimeout } from "@/lib/network";
import { calculateProfileScore } from "@/lib/scoring";
import { Coordinates, GeodataResult, MissionProfile, SiteScore } from "@/types";

const GEODATA_REQUEST_TIMEOUT_MS = 18_000;

function buildGeodataErrorMessage(error: unknown) {
  if (error instanceof ExternalRequestTimeoutError) {
    return "Live location data is taking longer than expected. GeoSight will keep working with partial context where possible.";
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "GeoSight couldn't load this location right now.";
}

export function useSiteAnalysis(coords: Coordinates, profile: MissionProfile, ready = true) {
  const [geodata, setGeodata] = useState<GeodataResult | null>(null);
  const [score, setScore] = useState<SiteScore | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastRequestKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const isDefaultView = coords.lat === DEFAULT_VIEW.lat && coords.lng === DEFAULT_VIEW.lng;
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
    lastRequestKeyRef.current = requestKey;

    if (isNewLocation) {
      setGeodata(null);
      setScore(null);
    }
    setLoading(true);
    setError(null);

    async function run() {
      try {
        const response = await fetchWithTimeout(
          `/api/geodata?lat=${coords.lat}&lng=${coords.lng}`,
          {
            signal: controller.signal,
          },
          GEODATA_REQUEST_TIMEOUT_MS,
        );
        if (!response.ok) {
          throw new Error("GeoSight couldn't load this location right now.");
        }

        const data = (await response.json()) as GeodataResult;
        if (!controller.signal.aborted) {
          setGeodata(data);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(buildGeodataErrorMessage(err));
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
