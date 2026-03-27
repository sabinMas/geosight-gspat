import * as turf from "@turf/turf";
import { BoundingBox, Coordinates } from "@/types";

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
