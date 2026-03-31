"use client";

import { useEffect, useState } from "react";
import { fetchWithTimeout } from "@/lib/network";
import type { HousingMarketResult } from "@/types";

const HOUSING_MARKET_TIMEOUT_MS = 18_000;

export function useHousingMarket(
  enabled: boolean,
  countyName: string | null | undefined,
  stateCode: string | null | undefined,
  locationLabel: string,
) {
  const [housingMarket, setHousingMarket] = useState<HousingMarketResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !countyName || !stateCode) {
      setHousingMarket(null);
      setLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    const params = new URLSearchParams({
      county: countyName,
      state: stateCode,
      location: locationLabel,
    });

    setLoading(true);
    setError(null);

    async function run() {
      try {
        const response = await fetchWithTimeout(
          `/api/housing-market?${params.toString()}`,
          { signal: controller.signal },
          HOUSING_MARKET_TIMEOUT_MS,
        );

        if (!response.ok) {
          throw new Error("GeoSight could not load housing market data right now.");
        }

        const payload = (await response.json()) as HousingMarketResult;
        if (!controller.signal.aborted) {
          setHousingMarket(payload);
        }
      } catch (requestError) {
        if (!controller.signal.aborted) {
          setHousingMarket(null);
          setError(
            requestError instanceof Error
              ? requestError.message
              : "GeoSight could not load housing market data right now.",
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
  }, [countyName, enabled, locationLabel, stateCode]);

  return { housingMarket, loading, error };
}
