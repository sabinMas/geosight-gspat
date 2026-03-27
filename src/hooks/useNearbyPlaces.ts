"use client";

import { useMemo, useState } from "react";
import { buildNearbyPlaces, NEARBY_PLACE_CATEGORY_LABELS } from "@/lib/nearby-places";
import { Coordinates, NearbyPlaceCategory } from "@/types";

const DEFAULT_CATEGORY: NearbyPlaceCategory = "trail";

export function useNearbyPlaces(coords: Coordinates, locationName: string) {
  const [category, setCategory] = useState<NearbyPlaceCategory>(DEFAULT_CATEGORY);

  const places = useMemo(
    () => buildNearbyPlaces(locationName, coords, category),
    [category, coords, locationName],
  );

  return {
    category,
    setCategory,
    categories: Object.entries(NEARBY_PLACE_CATEGORY_LABELS).map(([value, label]) => ({
      value: value as NearbyPlaceCategory,
      label,
    })),
    places,
    loading: false,
  };
}
