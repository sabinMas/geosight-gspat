"use client";

import { useEffect, useRef, useState } from "react";
import { DEFAULT_VIEW } from "@/lib/demo-data";
import { NEARBY_PLACE_CATEGORY_LABELS } from "@/lib/nearby-places";
import {
  Coordinates,
  NearbyPlace,
  NearbyPlaceCategory,
  NearbyPlacesSource,
} from "@/types";

const DEFAULT_CATEGORY: NearbyPlaceCategory = "trail";

export function useNearbyPlaces(coords: Coordinates, locationName: string, ready = true) {
  const [category, setCategory] = useState<NearbyPlaceCategory>(DEFAULT_CATEGORY);
  const [places, setPlaces] = useState<NearbyPlace[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<NearbyPlacesSource>("unavailable");
  const locationNameRef = useRef(locationName);

  useEffect(() => {
    locationNameRef.current = locationName;
  }, [locationName]);

  useEffect(() => {
    const isDefaultView = coords.lat === DEFAULT_VIEW.lat && coords.lng === DEFAULT_VIEW.lng;
    if (!ready && isDefaultView) {
      setLoading(false);
      setError(null);
      setSource("unavailable");
      setPlaces([]);
      return;
    }

    const controller = new AbortController();

    const run = async () => {
      setLoading(true);
      setError(null);
      setSource("unavailable");
      setPlaces([]);

      try {
        const params = new URLSearchParams({
          lat: String(coords.lat),
          lng: String(coords.lng),
          category,
          locationName: locationNameRef.current,
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
  }, [category, coords.lat, coords.lng, ready]);

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
