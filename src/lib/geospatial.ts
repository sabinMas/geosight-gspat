import * as turf from "@turf/turf";
import { BoundingBox, Coordinates, ElevationProfilePoint } from "@/types";

const WGS84_A = 6378137;
const WGS84_F = 1 / 298.257223563;
const UTM_SCALE_FACTOR = 0.9996;
const WGS84_E2 = WGS84_F * (2 - WGS84_F);
const WGS84_E_PRIME_2 = WGS84_E2 / (1 - WGS84_E2);
const LATITUDE_BANDS = "CDEFGHJKLMNPQRSTUVWX";
const MGRS_ROW_LETTERS_ODD = "ABCDEFGHJKLMNPQRSTUV";
const MGRS_ROW_LETTERS_EVEN = "FGHJKLMNPQRSTUVABCDE";
const MGRS_COLUMN_SETS = ["ABCDEFGH", "JKLMNPQR", "STUVWXYZ"] as const;

export interface UtmCoordinate {
  zoneNumber: number;
  zoneLetter: string;
  easting: number;
  northing: number;
  hemisphere: "N" | "S";
}

export function isValidCoordinates(coordinates: Coordinates) {
  return (
    Number.isFinite(coordinates.lat) &&
    Number.isFinite(coordinates.lng) &&
    coordinates.lat >= -90 &&
    coordinates.lat <= 90 &&
    coordinates.lng >= -180 &&
    coordinates.lng <= 180
  );
}

export function calculateDistanceKm(from: Coordinates, to: Coordinates) {
  if (!isValidCoordinates(from) || !isValidCoordinates(to)) {
    return null;
  }

  return turf.distance(turf.point([from.lng, from.lat]), turf.point([to.lng, to.lat]), {
    units: "kilometers",
  });
}

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

function getUtmZoneNumber({ lat, lng }: Coordinates) {
  if (lat >= 56 && lat < 64 && lng >= 3 && lng < 12) {
    return 32;
  }

  if (lat >= 72 && lat < 84) {
    if (lng >= 0 && lng < 9) return 31;
    if (lng >= 9 && lng < 21) return 33;
    if (lng >= 21 && lng < 33) return 35;
    if (lng >= 33 && lng < 42) return 37;
  }

  return Math.min(60, Math.max(1, Math.floor((lng + 180) / 6) + 1));
}

function getLatitudeBandLetter(latitude: number) {
  if (latitude < -80 || latitude > 84) {
    return null;
  }

  if (latitude >= 72) {
    return "X";
  }

  const bandIndex = Math.floor((latitude + 80) / 8);
  return LATITUDE_BANDS[Math.min(Math.max(bandIndex, 0), LATITUDE_BANDS.length - 1)] ?? null;
}

export function toUtmCoordinate(coordinates: Coordinates): UtmCoordinate | null {
  const { lat, lng } = coordinates;
  if (!isValidCoordinates(coordinates) || lat < -80 || lat > 84) {
    return null;
  }

  const zoneNumber = getUtmZoneNumber(coordinates);
  const zoneLetter = getLatitudeBandLetter(lat);
  if (!zoneLetter) {
    return null;
  }

  const latitudeRadians = (lat * Math.PI) / 180;
  const longitudeRadians = (lng * Math.PI) / 180;
  const centralMeridianDegrees = (zoneNumber - 1) * 6 - 180 + 3;
  const centralMeridianRadians = (centralMeridianDegrees * Math.PI) / 180;

  const sinLatitude = Math.sin(latitudeRadians);
  const cosLatitude = Math.cos(latitudeRadians);
  const tanLatitude = Math.tan(latitudeRadians);
  const n = WGS84_A / Math.sqrt(1 - WGS84_E2 * sinLatitude * sinLatitude);
  const t = tanLatitude * tanLatitude;
  const c = WGS84_E_PRIME_2 * cosLatitude * cosLatitude;
  const a = cosLatitude * (longitudeRadians - centralMeridianRadians);

  const meridionalArc =
    WGS84_A *
    ((1 -
      WGS84_E2 / 4 -
      (3 * WGS84_E2 * WGS84_E2) / 64 -
      (5 * WGS84_E2 * WGS84_E2 * WGS84_E2) / 256) *
      latitudeRadians -
      ((3 * WGS84_E2) / 8 +
        (3 * WGS84_E2 * WGS84_E2) / 32 +
        (45 * WGS84_E2 * WGS84_E2 * WGS84_E2) / 1024) *
        Math.sin(2 * latitudeRadians) +
      ((15 * WGS84_E2 * WGS84_E2) / 256 +
        (45 * WGS84_E2 * WGS84_E2 * WGS84_E2) / 1024) *
        Math.sin(4 * latitudeRadians) -
      ((35 * WGS84_E2 * WGS84_E2 * WGS84_E2) / 3072) *
        Math.sin(6 * latitudeRadians));

  const easting =
    UTM_SCALE_FACTOR *
      n *
      (a +
        ((1 - t + c) * Math.pow(a, 3)) / 6 +
        ((5 - 18 * t + t * t + 72 * c - 58 * WGS84_E_PRIME_2) * Math.pow(a, 5)) / 120) +
    500000;

  let northing =
    UTM_SCALE_FACTOR *
    (meridionalArc +
      n *
        tanLatitude *
        ((a * a) / 2 +
          ((5 - t + 9 * c + 4 * c * c) * Math.pow(a, 4)) / 24 +
          ((61 - 58 * t + t * t + 600 * c - 330 * WGS84_E_PRIME_2) * Math.pow(a, 6)) /
            720));

  const hemisphere: "N" | "S" = lat >= 0 ? "N" : "S";
  if (hemisphere === "S") {
    northing += 10_000_000;
  }

  return {
    zoneNumber,
    zoneLetter,
    easting,
    northing,
    hemisphere,
  };
}

export function toMgrsString(coordinates: Coordinates, precision = 5) {
  const utm = toUtmCoordinate(coordinates);
  if (!utm) {
    return null;
  }

  const setIndex = (utm.zoneNumber - 1) % MGRS_COLUMN_SETS.length;
  const columnLetters = MGRS_COLUMN_SETS[setIndex];
  const rowLetters = setIndex % 2 === 0 ? MGRS_ROW_LETTERS_ODD : MGRS_ROW_LETTERS_EVEN;

  const columnIndex = Math.max(1, Math.floor(utm.easting / 100000));
  const rowIndex = Math.floor(utm.northing / 100000) % rowLetters.length;
  const columnLetter = columnLetters[Math.min(columnIndex - 1, columnLetters.length - 1)];
  const rowLetter = rowLetters[rowIndex];

  const divisor = Math.pow(10, Math.max(5 - precision, 0));
  const eastingRemainder = Math.floor(utm.easting % 100000);
  const northingRemainder = Math.floor(utm.northing % 100000);
  const eastingString = String(Math.floor(eastingRemainder / divisor)).padStart(precision, "0");
  const northingString = String(Math.floor(northingRemainder / divisor)).padStart(precision, "0");

  return `${utm.zoneNumber}${utm.zoneLetter} ${columnLetter}${rowLetter} ${eastingString} ${northingString}`;
}
