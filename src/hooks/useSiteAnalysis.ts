"use client";

import { useEffect, useState } from "react";
import { calculateSiteScore } from "@/lib/scoring";
import { Coordinates, GeodataResult, SiteScore } from "@/types";

export function useSiteAnalysis(coords: Coordinates) {
  const [geodata, setGeodata] = useState<GeodataResult | null>(null);
  const [score, setScore] = useState<SiteScore | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/geodata?lat=${coords.lat}&lng=${coords.lng}`);
        if (!response.ok) {
          throw new Error("Failed to fetch geodata.");
        }

        const data = (await response.json()) as GeodataResult;
        if (!cancelled) {
          setGeodata(data);
          setScore(calculateSiteScore(data));
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unknown geodata error.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [coords.lat, coords.lng]);

  return { geodata, score, loading, error };
}
