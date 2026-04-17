// @ts-nocheck — depends on AnalysisMetricRow/AnalysisRiskLevel/DrawnGeometryFeature types wired on Phase 5 GIS integration.
import {
  along as turfAlong,
  area as turfArea,
  bbox as turfBbox,
  destination as turfDestination,
  distance as turfDistance,
  lineString as turfLineString,
  length as turfLength,
  point as turfPoint,
} from "@turf/turf";
import { formatAreaAcres, formatDistanceMiles } from "@/lib/analysis-geometry";
import { toBoundingBox } from "@/lib/geospatial";
import { OverpassElement, getElementCoordinates } from "@/lib/overpass";
import { fetchElevation } from "@/lib/usgs";
import {
  AnalysisMetricRow,
  AnalysisRiskLevel,
  BoundingBox,
  Coordinates,
  DrawnGeometryFeature,
  DrawnGeometryFeatureCollection,
  ElevationProfilePoint,
} from "@/types";

const ACRES_PER_SQUARE_METER = 0.0002471053814671653;

export interface LensGeometryContext {
  feature: DrawnGeometryFeature | null;
  centroid: Coordinates;
  bbox: BoundingBox;
  spanKm: number;
  areaAcres: number | null;
  lengthMiles: number | null;
  geometryLabel: string;
  sampleRadiusKm: number;
}

export interface TerrainSnapshot {
  minElevationMeters: number | null;
  maxElevationMeters: number | null;
  reliefMeters: number | null;
  averageElevationMeters: number | null;
  estimatedSlopePercent: number | null;
}

export interface LensAnalysisComputation {
  title: string;
  metrics: AnalysisMetricRow[];
  attribution: string[];
  details?: Record<string, unknown>;
  promptContext: Record<string, unknown>;
  fallbackNarrative: string;
}

function featureShapeLabel(feature: DrawnGeometryFeature | null) {
  if (!feature) {
    return "Place";
  }

  if (feature.geometry.type === "Point") {
    return "Point";
  }

  if (feature.geometry.type === "LineString") {
    return "Route";
  }

  return "Area";
}

function geometryCentroid(feature: DrawnGeometryFeature): Coordinates {
  if (feature.geometry.type === "Point") {
    const [lng, lat] = feature.geometry.coordinates;
    return { lat, lng };
  }

  if (feature.geometry.type === "LineString") {
    const coordinates = feature.geometry.coordinates;
    const middle = coordinates[Math.floor(coordinates.length / 2)] ?? coordinates[0];
    return {
      lat: middle[1],
      lng: middle[0],
    };
  }

  const [west, south, east, north] = turfBbox(feature);
  return {
    lat: (south + north) / 2,
    lng: (west + east) / 2,
  };
}

function featureAreaAcres(feature: DrawnGeometryFeature) {
  if (feature.geometry.type !== "Polygon") {
    return null;
  }

  return turfArea(feature) * ACRES_PER_SQUARE_METER;
}

function featureLengthMiles(feature: DrawnGeometryFeature) {
  if (feature.geometry.type !== "LineString") {
    return null;
  }

  return turfLength(feature, { units: "miles" });
}

function estimateSpanKm(bbox: BoundingBox) {
  const west = turfPoint([bbox.west, (bbox.south + bbox.north) / 2]);
  const east = turfPoint([bbox.east, (bbox.south + bbox.north) / 2]);
  const south = turfPoint([(bbox.west + bbox.east) / 2, bbox.south]);
  const north = turfPoint([(bbox.west + bbox.east) / 2, bbox.north]);
  const widthKm = turfDistance(west, east, { units: "kilometers" });
  const heightKm = turfDistance(south, north, { units: "kilometers" });

  return Math.max(1.2, Number(Math.max(widthKm, heightKm).toFixed(1)));
}

export function resolveActiveGeometry(
  geometry: DrawnGeometryFeatureCollection,
  selectedGeometryId: string | null | undefined,
  fallbackLocation: Coordinates | null,
): LensGeometryContext | null {
  const feature =
    (selectedGeometryId
      ? geometry.features.find((candidate) => candidate.properties.id === selectedGeometryId)
      : null) ??
    geometry.features[geometry.features.length - 1] ??
    null;

  if (!feature) {
    if (!fallbackLocation) {
      return null;
    }

    return {
      feature: null,
      centroid: fallbackLocation,
      bbox: toBoundingBox(fallbackLocation, 3),
      spanKm: 6,
      areaAcres: null,
      lengthMiles: null,
      geometryLabel: "Place",
      sampleRadiusKm: 3,
    };
  }

  const centroid = geometryCentroid(feature);
  const [west, south, east, north] = turfBbox(feature);
  const bbox = { west, south, east, north };
  const spanKm = estimateSpanKm(bbox);

  return {
    feature,
    centroid,
    bbox,
    spanKm,
    areaAcres: featureAreaAcres(feature),
    lengthMiles: featureLengthMiles(feature),
    geometryLabel: featureShapeLabel(feature),
    sampleRadiusKm: Math.min(Math.max(spanKm / 2, 1.5), 8),
  };
}

export async function sampleTerrainSnapshot(
  center: Coordinates,
  sampleRadiusKm: number,
): Promise<TerrainSnapshot> {
  const sampleDirections = [0, 90, 180, 270];
  const basePoint = turfPoint([center.lng, center.lat]);
  const samples = await Promise.all(
    [
      center,
      ...sampleDirections.map((bearing) => {
        const sample = turfDestination(basePoint, sampleRadiusKm, bearing, {
          units: "kilometers",
        });
        const [lng, lat] = sample.geometry.coordinates;
        return { lat, lng };
      }),
    ].map((coords) => fetchElevation(coords).catch(() => null)),
  );

  const validElevations = samples.filter((value): value is number => typeof value === "number");
  if (!validElevations.length) {
    return {
      minElevationMeters: null,
      maxElevationMeters: null,
      reliefMeters: null,
      averageElevationMeters: null,
      estimatedSlopePercent: null,
    };
  }

  const minElevationMeters = Math.min(...validElevations);
  const maxElevationMeters = Math.max(...validElevations);
  const reliefMeters = maxElevationMeters - minElevationMeters;
  const averageElevationMeters =
    validElevations.reduce((sum, value) => sum + value, 0) / validElevations.length;

  return {
    minElevationMeters: minElevationMeters,
    maxElevationMeters: maxElevationMeters,
    reliefMeters,
    averageElevationMeters,
    estimatedSlopePercent:
      sampleRadiusKm > 0
        ? Number(((reliefMeters / (sampleRadiusKm * 1000 * 2)) * 100).toFixed(1))
        : null,
  };
}

export async function buildElevationProfileFromCoordinates(
  coordinates: Coordinates[],
  samples = 12,
): Promise<{
  profile: ElevationProfilePoint[];
  lengthKm: number;
}> {
  if (coordinates.length < 2) {
    return { profile: [], lengthKm: 0 };
  }

  const line = turfLineString(coordinates.map((coord) => [coord.lng, coord.lat]));
  const lengthKm = turfLength(line, { units: "kilometers" });
  const sampleCount = Math.max(4, samples);
  const profileSeed = Array.from({ length: sampleCount }, (_, index) => {
    const distanceKm = lengthKm * (index / Math.max(sampleCount - 1, 1));
    const sample = turfAlong(line, distanceKm, { units: "kilometers" });
    const [lng, lat] = sample.geometry.coordinates;

    return {
      step: `${distanceKm.toFixed(1)} km`,
      distanceKm: Number(distanceKm.toFixed(2)),
      elevation: null,
      coordinates: { lat, lng },
    } satisfies ElevationProfilePoint;
  });

  const elevations = await Promise.all(
    profileSeed.map((point) => fetchElevation(point.coordinates).catch(() => null)),
  );

  return {
    profile: profileSeed.map((point, index) => ({
      ...point,
      elevation: elevations[index],
    })),
    lengthKm,
  };
}

export function nearestMatchingFeature(
  center: Coordinates,
  elements: OverpassElement[],
  predicate: (element: OverpassElement) => boolean,
  fallbackName: string,
) {
  const nearest = elements
    .filter(predicate)
    .map((element) => {
      const coordinates = getElementCoordinates(element);
      if (!coordinates) {
        return null;
      }

      return {
        element,
        distanceKm: turfDistance(
          turfPoint([center.lng, center.lat]),
          turfPoint([coordinates.lng, coordinates.lat]),
          { units: "kilometers" },
        ),
      };
    })
    .filter(
      (candidate): candidate is { element: OverpassElement; distanceKm: number } =>
        candidate !== null,
    )
    .sort((a, b) => a.distanceKm - b.distanceKm)[0];

  return {
    name:
      nearest?.element.tags?.name ??
      nearest?.element.tags?.ref ??
      nearest?.element.tags?.highway ??
      nearest?.element.tags?.waterway ??
      fallbackName,
    distanceKm: nearest ? Number(nearest.distanceKm.toFixed(1)) : null,
  };
}

export function formatDistanceKm(distanceKm: number | null) {
  if (distanceKm === null || !Number.isFinite(distanceKm)) {
    return "Unavailable";
  }

  return formatDistanceMiles(distanceKm * 0.621371);
}

export function formatAreaFromAcres(acres: number | null) {
  if (acres === null || !Number.isFinite(acres)) {
    return "Unavailable";
  }

  return formatAreaAcres(acres);
}

export function formatElevationFeet(meters: number | null) {
  if (meters === null || !Number.isFinite(meters)) {
    return "Unavailable";
  }

  return `${Math.round(meters * 3.28084).toLocaleString()} ft`;
}

export function formatPercent(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return "Unavailable";
  }

  return `${value.toFixed(value >= 10 ? 0 : 1)}%`;
}

export function toRiskLevel(
  value: number | null,
  thresholds: {
    low: number;
    moderate: number;
    reverse?: boolean;
  },
): AnalysisRiskLevel | undefined {
  if (value === null || !Number.isFinite(value)) {
    return undefined;
  }

  if (thresholds.reverse) {
    if (value >= thresholds.moderate) return "low";
    if (value >= thresholds.low) return "moderate";
    return "high";
  }

  if (value <= thresholds.low) return "low";
  if (value <= thresholds.moderate) return "moderate";
  return "high";
}

export function buildMetricRow(metric: AnalysisMetricRow): AnalysisMetricRow {
  return metric;
}
