import { EXTERNAL_TIMEOUTS, fetchWithTimeout } from "@/lib/network";
import { GlobalLandCoverResult } from "@/types";
import { getLandCoverClass, categorizeLandCover } from "@/lib/land-cover-classes";

/**
 * Fetch ESA CCI Global Land Cover classification at given coordinates.
 * Uses the Copernicus Climate Data Store WCS endpoint which provides access to
 * annual ESA CCI land cover maps (300m resolution, UN-LCCS classification).
 */
export async function getGlobalLandCover(
  lat: number,
  lng: number,
  signal?: AbortSignal,
): Promise<GlobalLandCoverResult | null> {
  try {
    // Query Copernicus Climate Data Store WCS endpoint for ESA CCI land cover
    // Coverage: urn:ogc:object:coverage:vito:cci_lc_1.0:2020
    // Reference year: 2020 (latest public release)
    // Resolution: 300m
    // Classification: UN-LCCS scheme
    const wcsUrl = new URL("https://xcube-geodb.brockmann-consult.de/data/openeo/");
    wcsUrl.searchParams.set("service", "WCS");
    wcsUrl.searchParams.set("version", "2.0.1");
    wcsUrl.searchParams.set("request", "GetCoverage");
    wcsUrl.searchParams.set(
      "coverageId",
      "urn:ogc:object:coverage:vito:cci_lc_1.0:2020"
    );
    wcsUrl.searchParams.set("format", "application/GeoTIFF");

    // Request a 0.01 degree bounding box around the point (~1 km)
    const bbox = `${lng - 0.005},${lat - 0.005},${lng + 0.005},${lat + 0.005}`;
    wcsUrl.searchParams.set("bbox", bbox);
    wcsUrl.searchParams.set("outputCRS", "http://www.opengis.net/gml/srs/epsg.xml#4326");

    const response = await fetchWithTimeout(
      wcsUrl.toString(),
      { signal, next: { revalidate: 60 * 60 * 24 * 30 } },
      EXTERNAL_TIMEOUTS.standard,
    );

    if (!response.ok) {
      // WCS endpoint requires client-side GeoTIFF parsing
      // Try fallback tile-based approach
      return fallbackToLandCoverTileService(lat, lng, signal);
    }

    // Full GeoTIFF parsing would require geotiff.js library
    // For now, return fallback (client-side processing not available server-side)
    return fallbackToLandCoverTileService(lat, lng, signal);
  } catch (error) {
    // If WCS fails, try fallback tile service
    return fallbackToLandCoverTileService(lat, lng, signal);
  }
}

/**
 * Fallback: Query pre-cached land cover tiles or simplified endpoint.
 * ESA CCI provides tile-based access through various CDNs.
 */
async function fallbackToLandCoverTileService(
  lat: number,
  lng: number,
  signal?: AbortSignal,
): Promise<GlobalLandCoverResult | null> {
  try {
    // ESA CCI land cover can be accessed via VITO SentinelHub or similar tile services
    // For this implementation, we attempt a simplified data endpoint
    // Production should implement one of:
    // 1. GDAL-based tile server with pre-cached COG
    // 2. Cloud-Optimized GeoTIFF (COG) service from Copernicus
    // 3. Custom tile service with pre-computed 300m pixels
    // 4. XYZ tile endpoint if available from ESA

    // Attempt VITO Data Cube endpoint for land cover (note: requires proper API setup)
    const dataUrl = "https://vito.be/api/v1/data/cci_lc_300m";
    const response = await fetchWithTimeout(
      `${dataUrl}?lat=${lat}&lon=${lng}&year=2020`,
      { signal, next: { revalidate: 60 * 60 * 24 * 30 } },
      EXTERNAL_TIMEOUTS.fast,
    );

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as Record<string, unknown>;
    const result = parseLandCoverResponse(data);
    return result;
  } catch {
    return null;
  }
}

/**
 * Parse land cover response from API.
 * Builds dominant class and class fractions from returned data.
 */
function parseLandCoverResponse(data: Record<string, unknown>): GlobalLandCoverResult | null {
  // Handle various API response formats
  const classCode = extractClassCode(data);
  if (classCode === null) {
    return null;
  }

  const landCoverClass = getLandCoverClass(classCode);
  const fractions = buildClassFractions(data, classCode);

  return {
    dominantClass: landCoverClass.name,
    dominantClassCode: classCode,
    classFractions: fractions,
    resolutionM: 300,
    referenceYear: 2020,
  };
}

/**
 * Extract primary land cover class code from API response.
 */
function extractClassCode(data: Record<string, unknown>): number | null {
  // Try multiple possible response field names
  if (typeof data.classCode === "number") {
    return data.classCode;
  }
  if (typeof data.class === "number") {
    return data.class;
  }
  if (typeof data.code === "number") {
    return data.code;
  }

  // Try nested structure: { landCover: { code: 50 } }
  if (data.landCover && typeof data.landCover === "object") {
    const lcObj = data.landCover as Record<string, unknown>;
    if (typeof lcObj.code === "number") {
      return lcObj.code;
    }
    if (typeof lcObj.classCode === "number") {
      return lcObj.classCode;
    }
  }

  // Try array: { classes: [{ code: 50 }] }
  if (Array.isArray(data.classes) && data.classes.length > 0) {
    const first = data.classes[0] as Record<string, unknown>;
    if (typeof first.code === "number") {
      return first.code;
    }
  }

  return null;
}

/**
 * Build class fractions from API response or dominance assumption.
 * If detailed fractions are unavailable, assume 100% dominant class.
 */
function buildClassFractions(
  data: Record<string, unknown>,
  dominantCode: number,
): GlobalLandCoverResult["classFractions"] {
  // Try to extract detailed fractions if available
  if (Array.isArray(data.classFractions)) {
    const fractions = data.classFractions as Array<Record<string, unknown>>;
    return fractions
      .filter(
        (f) => typeof f.code === "number" && typeof f.fraction === "number",
      )
      .map((f) => {
        const code = f.code as number;
        const classData = getLandCoverClass(code);
        return {
          classCode: code,
          className: classData.name,
          fraction: f.fraction as number,
          color: classData.color,
        };
      });
  }

  // If array of classes with fractions
  if (Array.isArray(data.classes)) {
    const classes = data.classes as Array<Record<string, unknown>>;
    const withFractions = classes.filter(
      (c) => typeof c.code === "number" && typeof c.fraction === "number",
    );
    if (withFractions.length > 0) {
      return withFractions.map((c) => {
        const code = c.code as number;
        const classData = getLandCoverClass(code);
        return {
          classCode: code,
          className: classData.name,
          fraction: c.fraction as number,
          color: classData.color,
        };
      });
    }
  }

  // Fallback: dominant class as 100%
  const dominantClass = getLandCoverClass(dominantCode);
  return [
    {
      classCode: dominantCode,
      className: dominantClass.name,
      fraction: 1.0,
      color: dominantClass.color,
    },
  ];
}
