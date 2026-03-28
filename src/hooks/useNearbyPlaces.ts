"use client";

import { useEffect, useState } from "react";
import { NEARBY_PLACE_CATEGORY_LABELS } from "@/lib/nearby-places";
import {
  Coordinates,
  NearbyPlace,
  NearbyPlaceCategory,
  NearbyPlacesSource,
} from "@/types";

const DEFAULT_CATEGORY: NearbyPlaceCategory = "trail";

export function useNearbyPlaces(coords: Coordinates, locationName: string) {
  const [category, setCategory] = useState<NearbyPlaceCategory>(DEFAULT_CATEGORY);
  const [places, setPlaces] = useState<NearbyPlace[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<NearbyPlacesSource>("unavailable");

  useEffect(() => {
    const controller = new AbortController();

    const run = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          lat: String(coords.lat),
          lng: String(coords.lng),
          category,
          locationName,
        });
        const response = await fetch(`/api/nearby-places?${params.toString()}`, {
          signal: controller.signal,
        });

        const payload = (await response.json()) as {
          places?: NearbyPlace[];
          source?: NearbyPlacesSource;
          error?: string;
        };

        if (!response.ok) {
          throw new Error(payload.error ?? "Unable to load nearby places.");
        }

        setPlaces(payload.places ?? []);
        setSource(payload.source ?? "unavailable");
        setError(payload.error ?? null);
      } catch (err) {
        if (controller.signal.aborted) {
          return;
        }

        setPlaces([]);
        setSource("unavailable");
        setError(err instanceof Error ? err.message : "Unable to load nearby places.");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void run();

    return () => controller.abort();
  }, [category, coords.lat, coords.lng, locationName]);

  return {
    category,
    setCategory,
    categories: Object.entries(NEARBY_PLACE_CATEGORY_LABELS).map(([value, label]) => ({
      value: value as NearbyPlaceCategory,
      label,
    })),
    places,
    loading,
    error,
    source,
  };
}
