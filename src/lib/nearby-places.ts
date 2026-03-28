import { Coordinates, NearbyPlaceCategory } from "@/types";

export const NEARBY_PLACE_CATEGORY_LABELS: Record<NearbyPlaceCategory, string> = {
  trail: "Trails",
  hike: "Hikes",
  restaurant: "Restaurants",
  landmark: "Landmarks",
};

function shortLocationName(locationName: string) {
  return locationName.split(",")[0]?.trim() || locationName;
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

export function calculateDistanceKm(from: Coordinates, to: Coordinates) {
  const earthRadiusKm = 6371;
  const latDelta = toRadians(to.lat - from.lat);
  const lngDelta = toRadians(to.lng - from.lng);
  const startLat = toRadians(from.lat);
  const endLat = toRadians(to.lat);

  const a =
    Math.sin(latDelta / 2) * Math.sin(latDelta / 2) +
    Math.cos(startLat) *
      Math.cos(endLat) *
      Math.sin(lngDelta / 2) *
      Math.sin(lngDelta / 2);

  return earthRadiusKm * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export function describeRelativeLocation(from: Coordinates, to: Coordinates) {
  const latDelta = to.lat - from.lat;
  const lngDelta = to.lng - from.lng;

  const vertical =
    Math.abs(latDelta) < 0.015 ? "" : latDelta > 0 ? "north" : "south";
  const horizontal =
    Math.abs(lngDelta) < 0.015 ? "" : lngDelta > 0 ? "east" : "west";

  if (vertical && horizontal) {
    return `${vertical}-${horizontal} of the selected point`;
  }

  if (vertical || horizontal) {
    return `${vertical || horizontal} of the selected point`;
  }

  return "near the selected point";
}

export function shortLocationLabel(locationName: string) {
  return shortLocationName(locationName);
}
