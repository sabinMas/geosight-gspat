"use client";

import { useEffect, useMemo, useState } from "react";
import { reverseGeocodeCoordinates } from "@/lib/location-search";
import { Coordinates, RegionSelection } from "@/types";
import { buildRegion } from "./useGlobeInteraction";

const QUICK_REGION_CACHE_PREFIX = "geosight-quick-regions";

const QUICK_REGION_DIRECTIONS = [
  {
    id: "north",
    characterLabel: "Northern Hills",
    latOffset: 0.1,
    lngOffset: 0,
  },
  {
    id: "east",
    characterLabel: "Eastern Fringe",
    latOffset: 0,
    lngOffset: 0.12,
  },
  {
    id: "south",
    characterLabel: "Downtown Core",
    latOffset: -0.08,
    lngOffset: 0,
  },
] as const;

interface CachedQuickRegion {
  directionId: (typeof QUICK_REGION_DIRECTIONS)[number]["id"];
  coordinates: Coordinates;
  neighborhoodName: string;
  locality: string;
  countryName: string;
}

function getCacheKey(coords: Coordinates) {
  return `${QUICK_REGION_CACHE_PREFIX}:${coords.lat.toFixed(3)}:${coords.lng.toFixed(3)}`;
}

function getDisplayNeighborhood(
  name: string | null | undefined,
  district?: string | null,
  locality?: string | null,
) {
  if (district?.trim()) {
    return district.trim();
  }

  if (name?.trim()) {
    return name.split(",")[0]?.trim() ?? name.trim();
  }

  return locality?.trim() ?? "Nearby area";
}

function getResidentialLabel(directionId: CachedQuickRegion["directionId"]) {
  return (
    QUICK_REGION_DIRECTIONS.find((direction) => direction.id === directionId)?.characterLabel ??
    "Nearby district"
  );
}

function toRegionSelection(region: CachedQuickRegion, profileId: string) {
  const name =
    profileId === "residential"
      ? getResidentialLabel(region.directionId)
      : region.neighborhoodName;
  const secondaryLabel =
    profileId === "residential"
      ? `${region.neighborhoodName} · ${region.locality}, ${region.countryName}`
      : `${region.locality}, ${region.countryName}`;

  return buildRegion(region.coordinates, name, secondaryLabel);
}

async function generateQuickRegionCache(selectedPoint: Coordinates) {
  const origin = await reverseGeocodeCoordinates(selectedPoint.lat, selectedPoint.lng, 10);
  const locality =
    origin?.locality ??
    origin?.district ??
    origin?.name.split(",")[0]?.trim() ??
    "Nearby";
  const countryName = origin?.countryName ?? origin?.countryCode?.toUpperCase() ?? "Unknown";

  const results = await Promise.all(
    QUICK_REGION_DIRECTIONS.map(async (direction) => {
      const coordinates = {
        lat: selectedPoint.lat + direction.latOffset,
        lng: selectedPoint.lng + direction.lngOffset,
      };

      try {
        const reverse = await reverseGeocodeCoordinates(coordinates.lat, coordinates.lng, 14);

        return {
          directionId: direction.id,
          coordinates,
          neighborhoodName: getDisplayNeighborhood(
            reverse?.name,
            reverse?.district,
            reverse?.locality,
          ),
          locality: reverse?.locality ?? locality,
          countryName: reverse?.countryName ?? countryName,
        } satisfies CachedQuickRegion;
      } catch {
        return {
          directionId: direction.id,
          coordinates,
          neighborhoodName: `${locality} ${direction.characterLabel}`,
          locality,
          countryName,
        } satisfies CachedQuickRegion;
      }
    }),
  );

  return results;
}

export function useQuickRegions(
  selectedPoint: Coordinates,
  locationReady: boolean,
  profileId: string,
) {
  const [quickRegions, setQuickRegions] = useState<RegionSelection[]>([]);
  const [quickRegionsLoading, setQuickRegionsLoading] = useState(false);

  const cacheKey = useMemo(() => getCacheKey(selectedPoint), [selectedPoint]);

  useEffect(() => {
    if (!locationReady) {
      setQuickRegions([]);
      setQuickRegionsLoading(false);
      return;
    }

    if (typeof window !== "undefined") {
      const cached = window.sessionStorage.getItem(cacheKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached) as CachedQuickRegion[];
          setQuickRegions(parsed.map((region) => toRegionSelection(region, profileId)));
          setQuickRegionsLoading(false);
          return;
        } catch {
          window.sessionStorage.removeItem(cacheKey);
        }
      }
    }

    let cancelled = false;
    setQuickRegionsLoading(true);

    async function run() {
      try {
        const generated = await generateQuickRegionCache(selectedPoint);
        if (cancelled) {
          return;
        }

        if (typeof window !== "undefined") {
          window.sessionStorage.setItem(cacheKey, JSON.stringify(generated));
        }

        setQuickRegions(generated.map((region) => toRegionSelection(region, profileId)));
      } catch (error) {
        if (!cancelled) {
          console.warn("[quick-regions] failed to generate dynamic quick regions", error);
          setQuickRegions([]);
        }
      } finally {
        if (!cancelled) {
          setQuickRegionsLoading(false);
        }
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [cacheKey, locationReady, profileId, selectedPoint]);

  return { quickRegions, quickRegionsLoading };
}
