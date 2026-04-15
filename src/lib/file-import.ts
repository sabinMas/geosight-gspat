import { bbox as turfBbox } from "@turf/turf";

const LAYER_COLOR_PALETTE = [
  "#ff6b6b",
  "#4ecdc4",
  "#45b7d1",
  "#96ceb4",
  "#ffeaa7",
  "#dfe6e9",
] as const;

const SUPPORTED_GEOMETRY_TYPES = new Set<GeoJSON.Geometry["type"]>([
  "Point",
  "MultiPoint",
  "LineString",
  "MultiLineString",
  "Polygon",
  "MultiPolygon",
  "GeometryCollection",
]);

const LATITUDE_HEADERS = new Set(["lat", "latitude", "y"]);
const LONGITUDE_HEADERS = new Set(["lng", "lon", "longitude", "x"]);
export const IMPORTED_FEATURE_ID_PROPERTY = "__geosightFeatureId";

let nextLayerColorIndex = 0;

export type ImportedLayer = {
  id: string;
  name: string;
  format: "geojson" | "kml" | "csv" | "gpx";
  features: GeoJSON.FeatureCollection;
  bounds: [number, number, number, number];
  style: {
    color: string;
    opacity: number;
    weight: number;
    fillOpacity: number;
    filled: boolean;
  };
  visible: boolean;
};

function buildLayerId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `imported-layer-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function buildFeatureId(prefix: string, index: number) {
  return `${prefix}-feature-${index + 1}`;
}

function nextLayerColor() {
  const color = LAYER_COLOR_PALETTE[nextLayerColorIndex % LAYER_COLOR_PALETTE.length];
  nextLayerColorIndex += 1;
  return color;
}

function getLayerName(filename: string) {
  return filename.replace(/\.[^.]+$/, "") || "Imported layer";
}

function inferFormat(filename: string): ImportedLayer["format"] {
  const normalized = filename.trim().toLowerCase();
  if (normalized.endsWith(".kml")) {
    return "kml";
  }
  if (normalized.endsWith(".csv")) {
    return "csv";
  }
  if (normalized.endsWith(".gpx")) {
    return "gpx";
  }
  if (normalized.endsWith(".geojson") || normalized.endsWith(".json")) {
    return "geojson";
  }

  throw new Error("Unsupported file format. Use GeoJSON, KML, CSV, or GPX.");
}

function readXmlDocument(text: string) {
  const document = new DOMParser().parseFromString(text, "application/xml");
  if (document.getElementsByTagName("parsererror").length > 0) {
    throw new Error("The XML file could not be parsed.");
  }
  return document;
}

function getElementsByLocalName(node: Document | Element, localName: string): Element[] {
  return Array.from(node.getElementsByTagNameNS("*", localName));
}

function getFirstDescendantText(node: Document | Element, localName: string) {
  return getElementsByLocalName(node, localName)[0]?.textContent?.trim() ?? null;
}

function parseCoordinateTuple(token: string): [number, number] | null {
  const [longitudeToken, latitudeToken] = token.split(",");
  const longitude = Number.parseFloat(longitudeToken ?? "");
  const latitude = Number.parseFloat(latitudeToken ?? "");

  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
    return null;
  }

  return [longitude, latitude];
}

function parseCoordinateList(text: string) {
  return text
    .trim()
    .split(/\s+/)
    .map((token) => parseCoordinateTuple(token))
    .filter((coordinate): coordinate is [number, number] => coordinate !== null);
}

function closePolygonRing(coordinates: [number, number][]) {
  if (coordinates.length < 3) {
    return null;
  }

  const first = coordinates[0];
  const last = coordinates[coordinates.length - 1];
  if (first[0] === last[0] && first[1] === last[1]) {
    return coordinates.length >= 4 ? coordinates : null;
  }

  return [...coordinates, first];
}

function sanitizeFeatureCollection(
  collection: GeoJSON.FeatureCollection,
): GeoJSON.FeatureCollection {
  const features = collection.features.filter(
    (feature): feature is GeoJSON.Feature => {
      if (!feature || feature.type !== "Feature" || !feature.geometry) {
        return false;
      }

      return SUPPORTED_GEOMETRY_TYPES.has(feature.geometry.type);
    },
  ).map((feature, index) => {
    const featureId =
      typeof feature.id === "string" || typeof feature.id === "number"
        ? String(feature.id)
        : buildFeatureId("imported", index);

    return {
      ...feature,
      id: featureId,
      properties: {
        ...(feature.properties ?? {}),
        [IMPORTED_FEATURE_ID_PROPERTY]: featureId,
      },
    };
  });

  if (features.length === 0) {
    throw new Error("No supported geometries were found in this file.");
  }

  return {
    type: "FeatureCollection",
    features,
  };
}

function parseGeoJson(text: string) {
  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("The GeoJSON file is not valid JSON.");
  }

  if (
    !parsed ||
    typeof parsed !== "object" ||
    !("type" in parsed) ||
    parsed.type !== "FeatureCollection" ||
    !("features" in parsed) ||
    !Array.isArray(parsed.features)
  ) {
    throw new Error("GeoJSON imports must be a FeatureCollection.");
  }

  return sanitizeFeatureCollection(parsed as GeoJSON.FeatureCollection);
}

function parseKml(text: string) {
  const document = readXmlDocument(text);
  const placemarks = getElementsByLocalName(document, "Placemark");
  const features: GeoJSON.Feature[] = [];

  for (const placemark of placemarks) {
    const name = getFirstDescendantText(placemark, "name");
    const description = getFirstDescendantText(placemark, "description");
    const properties: GeoJSON.GeoJsonProperties = {
      name,
      description,
      source: "kml",
    };

    for (const pointElement of getElementsByLocalName(placemark, "Point")) {
      const coordinatesText = getFirstDescendantText(pointElement, "coordinates");
      if (!coordinatesText) {
        continue;
      }

      const coordinate = parseCoordinateList(coordinatesText)[0];
      if (!coordinate) {
        continue;
      }

      features.push({
        type: "Feature",
        properties,
        geometry: {
          type: "Point",
          coordinates: coordinate,
        },
      });
    }

    for (const lineElement of getElementsByLocalName(placemark, "LineString")) {
      const coordinatesText = getFirstDescendantText(lineElement, "coordinates");
      if (!coordinatesText) {
        continue;
      }

      const coordinates = parseCoordinateList(coordinatesText);
      if (coordinates.length < 2) {
        continue;
      }

      features.push({
        type: "Feature",
        properties,
        geometry: {
          type: "LineString",
          coordinates,
        },
      });
    }

    for (const polygonElement of getElementsByLocalName(placemark, "Polygon")) {
      const outerBoundary = getElementsByLocalName(polygonElement, "outerBoundaryIs")[0];
      const ringElement = outerBoundary
        ? getElementsByLocalName(outerBoundary, "LinearRing")[0]
        : getElementsByLocalName(polygonElement, "LinearRing")[0];
      const coordinatesText = ringElement
        ? getFirstDescendantText(ringElement, "coordinates")
        : null;

      if (!coordinatesText) {
        continue;
      }

      const ring = closePolygonRing(parseCoordinateList(coordinatesText));
      if (!ring) {
        continue;
      }

      features.push({
        type: "Feature",
        properties,
        geometry: {
          type: "Polygon",
          coordinates: [ring],
        },
      });
    }
  }

  return sanitizeFeatureCollection({
    type: "FeatureCollection",
    features,
  });
}

function parseCsvRow(row: string) {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < row.length; index += 1) {
    const character = row[index];
    const next = row[index + 1];

    if (character === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (character === "," && !inQuotes) {
      cells.push(current);
      current = "";
      continue;
    }

    current += character;
  }

  cells.push(current);
  return cells.map((cell) => cell.trim());
}

function parseCsv(text: string) {
  const rows = text
    .split(/\r?\n/)
    .map((row) => row.trim())
    .filter((row) => row.length > 0);

  if (rows.length < 2) {
    throw new Error("The CSV needs a header row and at least one data row.");
  }

  const headers = parseCsvRow(rows[0]);
  const normalizedHeaders = headers.map((header) => header.toLowerCase());
  const latIndex = normalizedHeaders.findIndex((header) => LATITUDE_HEADERS.has(header));
  const lngIndex = normalizedHeaders.findIndex((header) => LONGITUDE_HEADERS.has(header));

  if (latIndex === -1 || lngIndex === -1) {
    throw new Error("The CSV must include latitude and longitude columns.");
  }

  const features: GeoJSON.Feature[] = [];

  for (const row of rows.slice(1)) {
    const cells = parseCsvRow(row);
    const latitude = Number.parseFloat(cells[latIndex] ?? "");
    const longitude = Number.parseFloat(cells[lngIndex] ?? "");

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      continue;
    }

    const properties = headers.reduce<Record<string, string>>((accumulator, header, index) => {
      if (index === latIndex || index === lngIndex) {
        return accumulator;
      }

      accumulator[header] = cells[index] ?? "";
      return accumulator;
    }, {});

    features.push({
      type: "Feature",
      properties,
      geometry: {
        type: "Point",
        coordinates: [longitude, latitude],
      },
    });
  }

  return sanitizeFeatureCollection({
    type: "FeatureCollection",
    features,
  });
}

function parseGpx(text: string) {
  const document = readXmlDocument(text);
  const features: GeoJSON.Feature[] = [];

  for (const waypoint of getElementsByLocalName(document, "wpt")) {
    const latitude = Number.parseFloat(waypoint.getAttribute("lat") ?? "");
    const longitude = Number.parseFloat(waypoint.getAttribute("lon") ?? "");

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      continue;
    }

    features.push({
      type: "Feature",
      properties: {
        name: getFirstDescendantText(waypoint, "name"),
        description: getFirstDescendantText(waypoint, "desc"),
        source: "gpx-waypoint",
      },
      geometry: {
        type: "Point",
        coordinates: [longitude, latitude],
      },
    });
  }

  for (const track of getElementsByLocalName(document, "trk")) {
    const name = getFirstDescendantText(track, "name");
    const segments = getElementsByLocalName(track, "trkseg")
      .map((segment) =>
        getElementsByLocalName(segment, "trkpt")
          .map((point) => {
            const latitude = Number.parseFloat(point.getAttribute("lat") ?? "");
            const longitude = Number.parseFloat(point.getAttribute("lon") ?? "");
            return Number.isFinite(latitude) && Number.isFinite(longitude)
              ? ([longitude, latitude] as [number, number])
              : null;
          })
          .filter((coordinate): coordinate is [number, number] => coordinate !== null),
      )
      .filter((segment) => segment.length >= 2);

    if (segments.length === 0) {
      continue;
    }

    features.push({
      type: "Feature",
      properties: {
        name,
        source: "gpx-track",
      },
      geometry:
        segments.length === 1
          ? {
              type: "LineString",
              coordinates: segments[0],
            }
          : {
              type: "MultiLineString",
              coordinates: segments,
            },
    });
  }

  return sanitizeFeatureCollection({
    type: "FeatureCollection",
    features,
  });
}

export function getLayerBounds(fc: GeoJSON.FeatureCollection): [number, number, number, number] {
  const [west, south, east, north] = turfBbox(fc);

  if (
    !Number.isFinite(west) ||
    !Number.isFinite(south) ||
    !Number.isFinite(east) ||
    !Number.isFinite(north)
  ) {
    throw new Error("Layer bounds could not be calculated.");
  }

  return [west, south, east, north];
}

export async function parseGeoFile(file: File): Promise<ImportedLayer> {
  const format = inferFormat(file.name);
  const text = await file.text();

  const features =
    format === "geojson"
      ? parseGeoJson(text)
      : format === "kml"
        ? parseKml(text)
        : format === "csv"
          ? parseCsv(text)
          : parseGpx(text);

  return {
    id: buildLayerId(),
    name: getLayerName(file.name),
    format,
    features,
    bounds: getLayerBounds(features),
    style: {
      color: nextLayerColor(),
      opacity: 0.8,
      weight: 2,
      fillOpacity: 0.22,
      filled: true,
    },
    visible: true,
  };
}
