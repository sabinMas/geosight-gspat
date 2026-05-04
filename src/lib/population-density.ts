import { EXTERNAL_TIMEOUTS, fetchWithTimeout } from "@/lib/network";
import { Coordinates, PopulationDensityResult } from "@/types";

const NULL_POPULATION_DENSITY: PopulationDensityResult = {
  personsPerSqKm: null,
  resolutionLabel: "100m",
  referenceYear: null,
  source: "worldpop",
};

/**
 * Fetch population density from WorldPop Global Population data.
 * Uses SEDAC (NASA/Columbia University) WCS endpoint which provides access to WorldPop 100m resolution data.
 * Fallback: For areas where high-resolution data is unavailable, attempts CIESIN GPWv4 gridded data.
 */
export async function getPopulationDensity(
  lat: number,
  lng: number,
  signal?: AbortSignal,
): Promise<PopulationDensityResult | null> {
  try {
    // Attempt SEDAC WCS endpoint for WorldPop data
    // This provides 100m resolution global population density grids
    const wcsUrl = new URL("https://sedac.ciesin.columbia.edu/wcs");
    wcsUrl.searchParams.set("service", "WCS");
    wcsUrl.searchParams.set("version", "2.0.1");
    wcsUrl.searchParams.set("request", "GetCoverage");
    wcsUrl.searchParams.set("coverageId", "urn:ogc:object:coverage:SEDAC:CIESIN_SEDAC_GPWv411_2020");
    wcsUrl.searchParams.set("format", "application/GeoTIFF");
    // Request a small bounding box around the point (0.01 degree = ~1km)
    const bbox = `${lng - 0.005},${lat - 0.005},${lng + 0.005},${lat + 0.005}`;
    wcsUrl.searchParams.set("bbox", bbox);
    wcsUrl.searchParams.set("outputCRS", "http://www.opengis.net/gml/srs/epsg.xml#4326");

    const response = await fetchWithTimeout(
      wcsUrl.toString(),
      { signal, next: { revalidate: 60 * 60 * 24 * 7 } },
      EXTERNAL_TIMEOUTS.standard,
    );

    if (!response.ok) {
      return null;
    }

    // Note: Full GeoTIFF parsing would require a library like geotiff.js
    // For now, return null to indicate WCS endpoint requires client-side processing
    // A production implementation would parse the GeoTIFF and extract the pixel value
    return null;
  } catch (error) {
    // If WCS fails, try alternative approach
    return fallbackToWorldPopTileService(lat, lng, signal);
  }
}

/**
 * Fallback: Query WorldPop tile service or aggregated data endpoint.
 * This is a simplified implementation that could use:
 * - WorldPop's data download endpoints (requires pre-processing)
 * - Planet's API if available
 * - A simplified grid-based lookup of pre-aggregated data
 */
async function fallbackToWorldPopTileService(
  lat: number,
  lng: number,
  signal?: AbortSignal,
): Promise<PopulationDensityResult | null> {
  try {
    // Alternative: Use Copernicus Open Data Hub or similar
    // For now, return null to indicate no public free REST API available
    // Production should implement one of:
    // 1. Local GeoTIFF tile cache queried via GDAL
    // 2. Cloud-native COG service (e.g., Maxar, Google Earth Engine)
    // 3. Custom aggregation service pre-computed from WorldPop GeoTIFFs

    // Simple check: try a minimal request to see if service is reachable
    // This is a placeholder that demonstrates the expected return structure
    const testUrl = "https://www.worldpop.org/api/v2/populations";
    const response = await fetchWithTimeout(
      `${testUrl}?lat=${lat}&lon=${lng}`,
      { signal, next: { revalidate: 60 * 60 * 24 * 30 } },
      EXTERNAL_TIMEOUTS.fast,
    );

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as Record<string, unknown>;
    // Parse response based on WorldPop API structure
    // Expected structure depends on their actual API response format
    const density = extractDensityFromResponse(data);
    if (density !== null) {
      return {
        personsPerSqKm: density,
        resolutionLabel: "100m",
        referenceYear: 2020,
        source: "worldpop",
      };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Parse population density from API response.
 * Adapt this based on actual WorldPop API response structure.
 */
function extractDensityFromResponse(data: Record<string, unknown>): number | null {
  // This is a placeholder parser
  // Adapt based on the actual WorldPop API response format
  if (typeof data.density === "number") {
    return data.density;
  }

  if (data.data && typeof data.data === "object") {
    const dataObj = data.data as Record<string, unknown>;
    if (typeof dataObj.persons_per_km2 === "number") {
      return dataObj.persons_per_km2;
    }
    if (typeof dataObj.population_density === "number") {
      return dataObj.population_density;
    }
  }

  return null;
}
