import * as turf from "@turf/turf";
import { BoundingBox, Coordinates, ElevationProfilePoint } from "@/types";

export function toBoundingBox(center: Coordinates, radiusKm = 3): BoundingBox {
  const point = turf.point([center.lng, center.lat]);
  const bboxPolygon = turf.buffer(point, radiusKm, { units: "kilometers" })!;
  const [west, south, east, north] = turf.bbox(bboxPolygon);

  return { west, south, east, north };
}

export function buildRectangle(center: Coordinates, halfSpan = 0.08): Coordinates[] {
  return [
    { lat: center.lat + halfSpan, lng: center.lng - halfSpan },
    { lat: center.lat + halfSpan, lng: center.lng + halfSpan },
    { lat: center.lat - halfSpan, lng: center.lng + halfSpan },
    { lat: center.lat - halfSpan, lng: center.lng - halfSpan },
  ];
}

export function estimateRegionSpanKm(bbox: BoundingBox) {
  const westPoint = turf.point([bbox.west, (bbox.north + bbox.south) / 2]);
  const eastPoint = turf.point([bbox.east, (bbox.north + bbox.south) / 2]);
  const widthKm = turf.distance(westPoint, eastPoint, { units: "kilometers" });

  return Number(Math.min(Math.max(widthKm, 6), 18).toFixed(1));
}

export function buildElevationTransect(
  center: Coordinates,
  lengthKm: number,
  samples = 9,
  bearing = 90,
) {
  const point = turf.point([center.lng, center.lat]);
  const halfLengthKm = lengthKm / 2;
  const start = turf.destination(point, halfLengthKm, bearing - 180, { units: "kilometers" });
  const end = turf.destination(point, halfLengthKm, bearing, { units: "kilometers" });
  const line = turf.lineString([
    start.geometry.coordinates,
    end.geometry.coordinates,
  ]);

  return Array.from({ length: samples }, (_, index) => {
    const segment = lengthKm * (index / Math.max(samples - 1, 1));
    const sampled = turf.along(line, segment, { units: "kilometers" });
    const [lng, lat] = sampled.geometry.coordinates;

    return {
      step: `${segment.toFixed(1)} km`,
      distanceKm: Number(segment.toFixed(1)),
      elevation: null,
      coordinates: { lat, lng },
    } satisfies ElevationProfilePoint;
  });
}
