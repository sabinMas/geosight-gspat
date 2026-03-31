"use client";

import { useCallback, useMemo, useState } from "react";
import { buildRectangle, toBoundingBox } from "@/lib/geospatial";
import { Coordinates, RegionSelection, StarterRegionSeed } from "@/types";

function buildRegion(center: Coordinates, label?: string): RegionSelection {
  const polygon = buildRectangle(center);
  return {
    id: `${label ?? "region"}-${center.lat.toFixed(4)}-${center.lng.toFixed(4)}`,
    name: label ?? `Analysis region ${center.lat.toFixed(2)}, ${center.lng.toFixed(2)}`,
    center,
    polygon,
    bbox: toBoundingBox(center),
  };
}

export function useGlobeInteraction(
  initialCoordinates: Coordinates,
  initialLocationName?: string,
  starterRegions: StarterRegionSeed[] = [],
) {
  const [selectedPoint, setSelectedPoint] = useState<Coordinates>(initialCoordinates);
  const [selectedLocationName, setSelectedLocationName] = useState(
    initialLocationName ?? `Location ${initialCoordinates.lat.toFixed(2)}, ${initialCoordinates.lng.toFixed(2)}`,
  );
  const [selectedRegion, setSelectedRegion] = useState<RegionSelection>(
    buildRegion(initialCoordinates, initialLocationName),
  );

  const selectPoint = useCallback((coords: Coordinates, label?: string) => {
    setSelectedPoint(coords);
    setSelectedLocationName(label ?? `Location ${coords.lat.toFixed(2)}, ${coords.lng.toFixed(2)}`);
    setSelectedRegion(buildRegion(coords, label));
  }, []);

  const quickRegions = useMemo(
    () => {
      const seeds = starterRegions.length
        ? starterRegions
        : [
            {
              id: "default-gorge",
              name: "Columbia River Gorge",
              coordinates: { lat: 45.7004, lng: -121.5215 },
              score: 0,
              summary: "General exploration example",
            },
            {
              id: "default-seattle",
              name: "Seattle, Washington",
              coordinates: { lat: 47.6062, lng: -122.3321 },
              score: 0,
              summary: "General exploration example",
            },
            {
              id: "default-olympic",
              name: "Olympic National Park",
              coordinates: { lat: 47.8021, lng: -123.6044 },
              score: 0,
              summary: "General exploration example",
            },
          ];

      return seeds.map((site) => buildRegion(site.coordinates, site.name));
    },
    [starterRegions],
  );

  return {
    selectedPoint,
    selectedLocationName,
    selectedRegion,
    selectPoint,
    setSelectedRegion,
    quickRegions,
  };
}
