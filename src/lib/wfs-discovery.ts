import { EXTERNAL_TIMEOUTS, fetchWithTimeout } from "@/lib/network";

export interface WFSCapability {
  name: string;
  title: string;
  abstractText?: string;
  defaultSRS?: string;
  bounds?: {
    minLat: number;
    minLng: number;
    maxLat: number;
    maxLng: number;
  };
}

export interface Feature {
  id: string;
  type: string;
  properties: Record<string, unknown>;
  geometry?: {
    type: "Point" | "LineString" | "Polygon" | "MultiPoint";
    coordinates: unknown;
  };
}

export interface BBox {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

/**
 * Fetch WFS GetCapabilities document and extract available feature types.
 * Returns a list of queryable feature collections with metadata.
 */
export async function getWFSCapabilities(
  url: string,
  signal?: AbortSignal,
): Promise<WFSCapability[]> {
  try {
    const capUrl = new URL(url);
    capUrl.searchParams.set("service", "WFS");
    capUrl.searchParams.set("version", "2.0.0");
    capUrl.searchParams.set("request", "GetCapabilities");

    const response = await fetchWithTimeout(
      capUrl.toString(),
      { signal },
      EXTERNAL_TIMEOUTS.standard,
    );

    if (!response.ok) {
      return [];
    }

    const text = await response.text();
    const capabilities = parseWFSCapabilities(text);
    return capabilities;
  } catch {
    return [];
  }
}

/**
 * Query WFS GetFeature for features within a bounding box.
 * Returns GeoJSON-like feature objects with properties.
 */
export async function queryWFSFeatures(
  url: string,
  featureName: string,
  bbox: BBox,
  signal?: AbortSignal,
): Promise<Feature[]> {
  try {
    const featureUrl = new URL(url);
    featureUrl.searchParams.set("service", "WFS");
    featureUrl.searchParams.set("version", "2.0.0");
    featureUrl.searchParams.set("request", "GetFeature");
    featureUrl.searchParams.set("typeName", featureName);
    featureUrl.searchParams.set("outputFormat", "application/json");
    featureUrl.searchParams.set(
      "bbox",
      `${bbox.minLng},${bbox.minLat},${bbox.maxLng},${bbox.maxLat}`,
    );
    featureUrl.searchParams.set("srsname", "EPSG:4326");

    const response = await fetchWithTimeout(
      featureUrl.toString(),
      { signal },
      EXTERNAL_TIMEOUTS.standard,
    );

    if (!response.ok) {
      return [];
    }

    const data = (await response.json()) as Record<string, unknown>;
    const features = parseGeoJSON(data);
    return features;
  } catch {
    return [];
  }
}

/**
 * Parse WFS GetCapabilities XML response.
 * Extracts feature type names, titles, and bounds.
 */
function parseWFSCapabilities(xmlText: string): WFSCapability[] {
  const capabilities: WFSCapability[] = [];

  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "text/xml");

    // Handle parse errors
    if (xmlDoc.documentElement.tagName === "parsererror") {
      return [];
    }

    // Get all FeatureType elements
    const featureTypes = xmlDoc.querySelectorAll(
      "FeatureType, wfs\\:FeatureType",
    );

    featureTypes.forEach((ft) => {
      const name = getElementText(ft, "Name");
      const title = getElementText(ft, "Title") || name;
      const abstractText = getElementText(ft, "Abstract");

      if (name) {
        capabilities.push({
          name,
          title,
          abstractText: abstractText || undefined,
          defaultSRS: getElementText(ft, "DefaultSRS") || undefined,
          bounds: parseBounds(ft),
        });
      }
    });
  } catch {
    // Silent fail; return empty array
  }

  return capabilities;
}

/**
 * Parse GeoJSON response from WFS GetFeature.
 * Handles both GeoJSON FeatureCollection and individual Feature objects.
 */
function parseGeoJSON(data: Record<string, unknown>): Feature[] {
  const features: Feature[] = [];

  if (
    data.type === "FeatureCollection" &&
    Array.isArray(data.features)
  ) {
    (data.features as Array<Record<string, unknown>>).forEach((f) => {
      const feature = parseFeature(f);
      if (feature) features.push(feature);
    });
  } else if (data.type === "Feature") {
    const feature = parseFeature(data);
    if (feature) features.push(feature);
  }

  return features;
}

/**
 * Parse individual GeoJSON Feature object.
 */
function parseFeature(f: Record<string, unknown>): Feature | null {
  const props = f.properties as Record<string, unknown>;
  const id = (f.id as string) || Object.values(props)[0]?.toString() || "feature";

  return {
    id,
    type: f.type as string,
    properties: props || {},
    geometry: f.geometry as Feature["geometry"],
  };
}

/**
 * Get text content of first matching element.
 */
function getElementText(parent: Element, tagName: string): string {
  const el = parent.querySelector(tagName);
  return el?.textContent?.trim() || "";
}

/**
 * Parse WFS bounds (ows:WGS84BoundingBox or BoundingBox).
 */
function parseBounds(ftElement: Element): BBox | undefined {
  const bboxEl = ftElement.querySelector(
    "ows\\:WGS84BoundingBox, WGS84BoundingBox",
  );
  if (!bboxEl) return undefined;

  const lowerCorner = getElementText(bboxEl, "ows\\:LowerCorner, LowerCorner")
    .split(" ")
    .map(Number);
  const upperCorner = getElementText(bboxEl, "ows\\:UpperCorner, UpperCorner")
    .split(" ")
    .map(Number);

  if (lowerCorner.length >= 2 && upperCorner.length >= 2) {
    return {
      minLng: lowerCorner[0],
      minLat: lowerCorner[1],
      maxLng: upperCorner[0],
      maxLat: upperCorner[1],
    };
  }

  return undefined;
}
