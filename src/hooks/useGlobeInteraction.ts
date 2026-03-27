"use client";

import { useMemo, useState } from "react";
import { buildRectangle, toBoundingBox } from "@/lib/geospatial";
import { Coordinates, RegionSelection } from "@/types";

function buildRegion(center: Coordinates): RegionSelection {
  const polygon = buildRectangle(center);
  return {
    id: `${center.lat.toFixed(4)}-${center.lng.toFixed(4)}`,
    name: `Analysis region ${center.lat.toFixed(2)}, ${center.lng.toFixed(2)}`,
    center,
    polygon,
    bbox: toBoundingBox(center),
  };
}

export function useGlobeInteraction(initialCoordinates: Coordinates) {
  const [selectedPoint, setSelectedPoint] = useState<Coordinates>(initialCoordinates);
  const [selectedRegion, setSelectedRegion] = useState<RegionSelection>(buildRegion(initialCoordinates));

  const selectPoint = (coords: Coordinates) => {
    setSelectedPoint(coords);
    setSelectedRegion(buildRegion(coords));
  };

  const quickRegions = useMemo(
    () => [
      buildRegion({ lat: 45.5946, lng: -121.1787 }),
      buildRegion({ lat: 45.8399, lng: -119.7069 }),
      buildRegion({ lat: 47.4235, lng: -120.3103 }),
    ],
    [],
  );

  return {
    selectedPoint,
    selectedRegion,
    selectPoint,
    setSelectedRegion,
    quickRegions,
  };
}
