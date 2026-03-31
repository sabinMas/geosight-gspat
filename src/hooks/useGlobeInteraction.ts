"use client";

import { useCallback, useState } from "react";
import { buildRectangle, toBoundingBox } from "@/lib/geospatial";
import { Coordinates, RegionSelection } from "@/types";

export function buildRegion(
  center: Coordinates,
  label?: string,
  secondaryLabel?: string,
): RegionSelection {
  const polygon = buildRectangle(center);
  return {
    id: `${label ?? "region"}-${center.lat.toFixed(4)}-${center.lng.toFixed(4)}`,
    name: label ?? `Analysis region ${center.lat.toFixed(2)}, ${center.lng.toFixed(2)}`,
    secondaryLabel,
    center,
    polygon,
    bbox: toBoundingBox(center),
  };
}

export function useGlobeInteraction(initialCoordinates: Coordinates, initialLocationName?: string) {
  const [selectedPoint, setSelectedPoint] = useState<Coordinates>(initialCoordinates);
  const [selectedLocationName, setSelectedLocationName] = useState(
    initialLocationName ??
      `Location ${initialCoordinates.lat.toFixed(2)}, ${initialCoordinates.lng.toFixed(2)}`,
  );
  const [selectedLocationDisplayName, setSelectedLocationDisplayName] = useState(
    initialLocationName ??
      `Location ${initialCoordinates.lat.toFixed(2)}, ${initialCoordinates.lng.toFixed(2)}`,
  );
  const [selectedRegion, setSelectedRegion] = useState<RegionSelection>(
    buildRegion(initialCoordinates, initialLocationName),
  );

  const selectPoint = useCallback((coords: Coordinates, label?: string, displayLabel?: string) => {
    setSelectedPoint(coords);
    setSelectedLocationName(label ?? `Location ${coords.lat.toFixed(2)}, ${coords.lng.toFixed(2)}`);
    setSelectedLocationDisplayName(
      displayLabel ?? label ?? `Location ${coords.lat.toFixed(2)}, ${coords.lng.toFixed(2)}`,
    );
    setSelectedRegion(buildRegion(coords, displayLabel ?? label));
  }, []);

  return {
    selectedPoint,
    selectedLocationName,
    selectedLocationDisplayName,
    selectedRegion,
    selectPoint,
    setSelectedRegion,
  };
}
