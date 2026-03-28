"use client";

import { useEffect, useState } from "react";
import { Coordinates, SchoolContextResult } from "@/types";

export function useSchoolContext(coords: Coordinates) {
  const [schoolContext, setSchoolContext] = useState<SchoolContextResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/schools?lat=${coords.lat}&lng=${coords.lng}`);
        if (!response.ok) {
          throw new Error("Failed to fetch school context.");
        }

        const data = (await response.json()) as SchoolContextResult;
        if (!cancelled) {
          setSchoolContext(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unknown school-data error.");
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

  return { schoolContext, loading, error };
}
