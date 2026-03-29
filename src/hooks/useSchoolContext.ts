"use client";

import { useEffect, useState } from "react";
import { Coordinates, SchoolContextResult } from "@/types";

export function useSchoolContext(coords: Coordinates) {
  const [schoolContext, setSchoolContext] = useState<SchoolContextResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    setSchoolContext(null);
    setLoading(true);
    setError(null);

    async function run() {
      try {
        const response = await fetch(`/api/schools?lat=${coords.lat}&lng=${coords.lng}`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error("Failed to fetch school context.");
        }

        const data = (await response.json()) as SchoolContextResult;
        if (!controller.signal.aborted) {
          setSchoolContext(data);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : "Unknown school-data error.");
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
  }, [coords.lat, coords.lng]);

  return { schoolContext, loading, error };
}
