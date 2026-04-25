"use client";

import { useEffect, useState } from "react";
import type { Coordinates, NpsPark } from "@/types";

interface UseNpsTrailsOptions {
  selectedPoint: Coordinates | null;
  profileId: string;
  radiusKm?: number;
}

interface UseNpsTrailsResult {
  parks: NpsPark[];
  loading: boolean;
  error: string | null;
  source: "live" | "unavailable" | null;
}

export function useNpsTrails({
  selectedPoint,
  profileId,
  radiusKm = 200,
}: UseNpsTrailsOptions): UseNpsTrailsResult {
  const [parks, setParks] = useState<NpsPark[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<"live" | "unavailable" | null>(null);

  useEffect(() => {
    if (profileId !== "hiking" || !selectedPoint) {
      setParks([]);
      setSource(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({
      lat: String(selectedPoint.lat),
      lng: String(selectedPoint.lng),
      radiusKm: String(radiusKm),
    });

    fetch(`/api/nps-trails?${params.toString()}`)
      .then((res) => res.json())
      .then((data: { parks: NpsPark[]; source: "live" | "unavailable"; error?: string }) => {
        if (cancelled) return;
        setParks(data.parks ?? []);
        setSource(data.source);
        if (data.error) setError(data.error);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load NPS trail data");
        setSource("unavailable");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
    // Intentionally subscribe to the primitives so object reference churn
    // (e.g. parent component re-render) does not trigger an extra fetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPoint?.lat, selectedPoint?.lng, profileId, radiusKm]);

  return { parks, loading, error, source };
}
