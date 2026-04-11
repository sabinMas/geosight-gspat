import { area as turfArea, bbox as turfBbox, circle as turfCircle, length as turfLength } from "@turf/turf";
import type { FeatureCollection, Position } from "geojson";
import {
  Coordinates,
  DrawnGeometryFeature,
  DrawnGeometry,
  DrawnGeometryFeatureCollection,
  DrawnGeometryProperties,
  DrawnMeasurement,
  DrawnShape,
} from "@/types";

const ACRES_PER_SQUARE_METER = 0.0002471053814671653;
const CIRCLE_STEPS = 64;

function toPositions(coords: Coordinates[]): Position[] {
  return coords.map((coord) => [coord.lng, coord.lat]);
}

function closeRing(coords: Coordinates[]) {
  if (coords.length === 0) {
    return [];
  }

  const first = coords[0];
  const last = coords[coords.length - 1];
  if (first.lat === last.lat && first.lng === last.lng) {
    return coords;
  }

  return [...coords, first];
}

export function formatDistanceMiles(miles: number) {
  if (!Number.isFinite(miles)) {
    return "";
  }

  if (miles < 0.1) {
    return `${(miles * 5280).toFixed(0)} ft`;
  }

  return `${miles.toFixed(miles >= 10 ? 1 : 2)} mi`;
}

export function formatAreaAcres(acres: number) {
  if (!Number.isFinite(acres)) {
    return "";
  }

  if (acres < 1) {
    return `${acres.toFixed(2)} acres`;
  }

  if (acres >= 1000) {
    return `${Math.round(acres).toLocaleString()} acres`;
  }

  return `${acres.toFixed(acres >= 100 ? 0 : 1)} acres`;
}

export function buildRectangleCoordinates(a: Coordinates, b: Coordinates): Coordinates[] {
  const south = Math.min(a.lat, b.lat);
  const north = Math.max(a.lat, b.lat);
  const west = Math.min(a.lng, b.lng);
  const east = Math.max(a.lng, b.lng);

  return [
    { lat: south, lng: west },
    { lat: south, lng: east },
    { lat: north, lng: east },
    { lat: north, lng: west },
  ];
}

export function translateCoordinate(
  coord: Coordinates,
  delta: { lat: number; lng: number },
): Coordinates {
  return {
    lat: coord.lat + delta.lat,
    lng: coord.lng + delta.lng,
  };
}

export function computeCircleRadiusMeters(center: Coordinates, edge: Coordinates) {
  const earthRadiusMeters = 6_371_000;
  const dLat = ((edge.lat - center.lat) * Math.PI) / 180;
  const dLng = ((edge.lng - center.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((center.lat * Math.PI) / 180) *
      Math.cos((edge.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;

  return earthRadiusMeters * 2 * Math.asin(Math.sqrt(a));
}

export function buildCircleCoordinates(center: Coordinates, radiusMeters: number) {
  if (!Number.isFinite(radiusMeters) || radiusMeters <= 0) {
    return [];
  }

  const polygon = turfCircle([center.lng, center.lat], radiusMeters / 1000, {
    steps: CIRCLE_STEPS,
    units: "kilometers",
  });

  const ring = polygon.geometry.coordinates[0] ?? [];
  return ring.slice(0, -1).map(([lng, lat]) => ({ lat, lng }));
}

export function measurementFromShape(shape: DrawnShape): DrawnMeasurement | undefined {
  if (shape.type === "point") {
    return undefined;
  }

  if (shape.type === "polyline" && shape.coordinates.length >= 2) {
    const miles = turfLength(
      {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: toPositions(shape.coordinates),
        },
      },
      { units: "miles" },
    );

    return {
      kind: "distance",
      value: miles,
      unit: "miles",
      display: formatDistanceMiles(miles),
    };
  }

  let polygonCoords: Coordinates[] = [];
  if (shape.type === "circle") {
    const radiusMeters =
      shape.radiusMeters ??
      (shape.coordinates.length >= 2
        ? computeCircleRadiusMeters(shape.coordinates[0], shape.coordinates[1])
        : 0);
    polygonCoords = buildCircleCoordinates(shape.coordinates[0], radiusMeters);
  } else if (shape.coordinates.length >= 3) {
    polygonCoords = shape.coordinates;
  }

  if (polygonCoords.length >= 3) {
    const squareMeters = turfArea({
      type: "Feature",
      properties: {},
      geometry: {
        type: "Polygon",
        coordinates: [toPositions(closeRing(polygonCoords))],
      },
    });
    const acres = squareMeters * ACRES_PER_SQUARE_METER;

    return {
      kind: "area",
      value: acres,
      unit: "acres",
      display: formatAreaAcres(acres),
    };
  }

  return undefined;
}

export function withShapeMeasurement(shape: DrawnShape): DrawnShape {
  const measurement = measurementFromShape(shape);
  return {
    ...shape,
    measurement,
    measurementLabel: measurement?.display,
  };
}

function baseProperties(shape: DrawnShape): DrawnGeometryProperties {
  return {
    id: shape.id,
    label: shape.label ?? null,
    color: shape.color,
    shapeType: shape.type,
    measurementLabel: shape.measurementLabel ?? shape.measurement?.display ?? null,
    measurementKind: shape.measurement?.kind ?? null,
    measurementUnit: shape.measurement?.unit ?? null,
    measurementValue: shape.measurement?.value ?? null,
    radiusMeters: shape.radiusMeters ?? null,
  };
}

export function drawnShapeToFeature(shape: DrawnShape): DrawnGeometryFeature {
  if (shape.type === "point") {
    const point = shape.coordinates[0];
    return {
      type: "Feature",
      properties: baseProperties(shape),
      geometry: {
        type: "Point",
        coordinates: [point.lng, point.lat],
      },
    };
  }

  if (shape.type === "polyline") {
    return {
      type: "Feature",
      properties: baseProperties(shape),
      geometry: {
        type: "LineString",
        coordinates: toPositions(shape.coordinates),
      },
    };
  }

  const polygonCoords =
    shape.type === "circle"
      ? buildCircleCoordinates(
          shape.coordinates[0],
          shape.radiusMeters ??
            (shape.coordinates[1]
              ? computeCircleRadiusMeters(shape.coordinates[0], shape.coordinates[1])
              : 0),
        )
      : shape.coordinates;

  return {
    type: "Feature",
    properties: baseProperties(shape),
    geometry: {
      type: "Polygon",
      coordinates: [toPositions(closeRing(polygonCoords))],
    },
  };
}

export function drawnShapesToFeatureCollection(
  shapes: DrawnShape[],
): DrawnGeometryFeatureCollection {
  return {
    type: "FeatureCollection",
    features: shapes.map((shape) => drawnShapeToFeature(withShapeMeasurement(shape))),
  };
}

function featureToShapeCoordinates(feature: DrawnGeometryFeature): Coordinates[] {
  if (feature.geometry.type === "Point") {
    const [lng, lat] = feature.geometry.coordinates;
    return [{ lat, lng }];
  }

  if (feature.geometry.type === "LineString") {
    return feature.geometry.coordinates.map(([lng, lat]) => ({ lat, lng }));
  }

  const ring = feature.geometry.coordinates[0] ?? [];
  return ring.slice(0, -1).map(([lng, lat]) => ({ lat, lng }));
}

export function featureToDrawnShape(feature: DrawnGeometryFeature): DrawnShape {
  const properties = feature.properties ?? {};
  const shape: DrawnShape = {
    id: properties.id ?? crypto.randomUUID(),
    type: properties.shapeType ?? (feature.geometry.type === "Point"
      ? "point"
      : feature.geometry.type === "LineString"
        ? "polyline"
        : "polygon"),
    coordinates: featureToShapeCoordinates(feature),
    label: properties.label ?? undefined,
    color: properties.color ?? "#00e5ff",
    measurement:
      properties.measurementKind &&
      properties.measurementUnit &&
      typeof properties.measurementValue === "number"
        ? {
            kind: properties.measurementKind,
            unit: properties.measurementUnit,
            value: properties.measurementValue,
            display: properties.measurementLabel ?? "",
          }
        : undefined,
    measurementLabel: properties.measurementLabel ?? undefined,
    radiusMeters:
      typeof properties.radiusMeters === "number" ? properties.radiusMeters : undefined,
  };

  return withShapeMeasurement(shape);
}

export function featureCollectionToShapes(
  collection: DrawnGeometryFeatureCollection,
): DrawnShape[] {
  return collection.features.map((feature) => featureToDrawnShape(feature));
}

export function featureCollectionBounds(
  collection: FeatureCollection<DrawnGeometry, DrawnGeometryProperties>,
) {
  if (!collection.features.length) {
    return null;
  }

  const [west, south, east, north] = turfBbox(collection);
  return { west, south, east, north };
}

export function updateShapeVertex(
  shape: DrawnShape,
  vertexIndex: number,
  coord: Coordinates,
): DrawnShape {
  if (shape.type === "point") {
    return withShapeMeasurement({
      ...shape,
      coordinates: [coord],
    });
  }

  if (shape.type === "circle") {
    const center = shape.coordinates[0];
    const edge = shape.coordinates[1] ?? shape.coordinates[0];

    if (vertexIndex === 0) {
      const delta = {
        lat: coord.lat - center.lat,
        lng: coord.lng - center.lng,
      };
      return withShapeMeasurement({
        ...shape,
        coordinates: [coord, translateCoordinate(edge, delta)],
      });
    }

    return withShapeMeasurement({
      ...shape,
      coordinates: [center, coord],
      radiusMeters: computeCircleRadiusMeters(center, coord),
    });
  }

  if (shape.type === "rectangle" && shape.coordinates.length === 4) {
    const opposite = shape.coordinates[(vertexIndex + 2) % 4];
    return withShapeMeasurement({
      ...shape,
      coordinates: buildRectangleCoordinates(opposite, coord),
    });
  }

  return withShapeMeasurement({
    ...shape,
    coordinates: shape.coordinates.map((candidate, index) =>
      index === vertexIndex ? coord : candidate,
    ),
  });
}

export function isAreaShape(shape: DrawnShape) {
  return shape.type === "polygon" || shape.type === "rectangle" || shape.type === "circle";
}

export function getShapeFeatureBounds(shape: DrawnShape) {
  return featureCollectionBounds({
    type: "FeatureCollection",
    features: [drawnShapeToFeature(withShapeMeasurement(shape))],
  });
}

export function getShapeCentroid(shape: DrawnShape): Coordinates | null {
  const feature = drawnShapeToFeature(withShapeMeasurement(shape));
  const bounds = featureCollectionBounds({
    type: "FeatureCollection",
    features: [feature],
  });

  if (!bounds) {
    return null;
  }

  return {
    lat: (bounds.south + bounds.north) / 2,
    lng: (bounds.west + bounds.east) / 2,
  };
}

export type GeometryFeature = DrawnGeometryFeature;
