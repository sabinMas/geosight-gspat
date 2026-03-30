"use client";

import { useEffect, useState } from "react";
import { DEFAULT_VIEW } from "@/lib/demo-data";
import { ExternalRequestTimeoutError, fetchWithTimeout } from "@/lib/network";
import { Coordinates, SchoolContextResult } from "@/types";

export function useSchoolContext(coords: Coordinates, ready = true) {
  const [schoolContext, setSchoolContext] = useState<SchoolContextResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const isDefaultView = coords.lat === DEFAULT_VIEW.lat && coords.lng === DEFAULT_VIEW.lng;
    if (!ready && isDefaultView) {
      setSchoolContext(null);
      setLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();

    setSchoolContext(null);
    setLoading(true);
    setError(null);

    async function run() {
      try {
        const response = await fetchWithTimeout(
          `/api/schools?lat=${coords.lat}&lng=${coords.lng}`,
          {
            signal: controller.signal,
          },
          12_000,
        );
        if (!response.ok) {
          throw new Error("Failed to fetch school context.");
        }

        const data = (await response.json()) as SchoolContextResult;
        if (!controller.signal.aborted) {
          setSchoolContext(data);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(
            err instanceof ExternalRequestTimeoutError
              ? "School context timed out. GeoSight will keep working without it for now."
              : err instanceof Error
                ? err.message
                : "Unknown school-data error.",
          );
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

  return { schoolContext, loading, error };
}
