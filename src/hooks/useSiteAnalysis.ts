"use client";

import { useEffect, useState } from "react";
import { DEFAULT_VIEW } from "@/lib/demo-data";
import { calculateProfileScore } from "@/lib/scoring";
import { Coordinates, GeodataResult, MissionProfile, SiteScore } from "@/types";

export function useSiteAnalysis(coords: Coordinates, profile: MissionProfile, ready = true) {
  const [geodata, setGeodata] = useState<GeodataResult | null>(null);
  const [score, setScore] = useState<SiteScore | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const isDefaultView = coords.lat === DEFAULT_VIEW.lat && coords.lng === DEFAULT_VIEW.lng;
    if (!ready && isDefaultView) {
      setGeodata(null);
      setScore(null);
      setLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();

    setGeodata(null);
    setScore(null);
    setLoading(true);
    setError(null);

    async function run() {
      try {
        const response = await fetch(`/api/geodata?lat=${coords.lat}&lng=${coords.lng}`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error("Failed to fetch geodata.");
        }

        const data = (await response.json()) as GeodataResult;
        if (!controller.signal.aborted) {
          setGeodata(data);
          setScore(calculateProfileScore(data, profile));
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : "Unknown geodata error.");
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
  }, [coords.lat, coords.lng, profile, ready]);

  return { geodata, score, loading, error };
}
