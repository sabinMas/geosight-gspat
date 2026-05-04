import { EXTERNAL_TIMEOUTS, fetchWithTimeout } from "@/lib/network";
import { FloodHazardResult } from "@/types";

/**
 * Fetch global flood hazard probability at given coordinates.
 * Uses Global Flood Monitoring System (GFMS) or World Bank flood probabilistic maps.
 * Returns flood probability (%) and return period in years.
 */
export async function getFloodHazard(
  lat: number,
  lng: number,
  signal?: AbortSignal,
): Promise<FloodHazardResult | null> {
  try {
    // Attempt GFMS API endpoint for global flood hazard probability
    // https://www.globalflooding.spe.org provides 1 km resolution flood hazard maps
    const gfmsUrl = new URL("https://www.globalflooding.spe.org/api/v1/hazard");
    gfmsUrl.searchParams.set("lat", lat.toString());
    gfmsUrl.searchParams.set("lon", lng.toString());
    gfmsUrl.searchParams.set("returnPeriod", "475");

    const response = await fetchWithTimeout(
      gfmsUrl.toString(),
      { signal, next: { revalidate: 60 * 60 * 24 * 30 } },
      EXTERNAL_TIMEOUTS.standard,
    );

    if (!response.ok) {
      // Fallback to World Bank flood hazard maps
      return fallbackToWorldBankFloodHazard(lat, lng, signal);
    }

    const data = (await response.json()) as Record<string, unknown>;
    const result = parseFloodHazardResponse(data);
    return result;
  } catch {
    // If GFMS fails, try World Bank fallback
    return fallbackToWorldBankFloodHazard(lat, lng, signal);
  }
}

/**
 * Fallback: Query World Bank flood hazard raster via WCS or tile service.
 * Provides probabilistic flood risk maps at global coverage.
 */
async function fallbackToWorldBankFloodHazard(
  lat: number,
  lng: number,
  signal?: AbortSignal,
): Promise<FloodHazardResult | null> {
  try {
    // World Bank Climate Change Knowledge Portal provides flood hazard data
    // Alternative: OpenDRI flood risk data or UNEP GRID
    const dataUrl =
      "https://climateportal.worldbank.org/api/v1/flood_hazard";
    const response = await fetchWithTimeout(
      `${dataUrl}?lat=${lat}&lon=${lng}&scenario=current`,
      { signal, next: { revalidate: 60 * 60 * 24 * 30 } },
      EXTERNAL_TIMEOUTS.fast,
    );

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as Record<string, unknown>;
    const result = parseFloodHazardResponse(data);
    return result;
  } catch {
    return null;
  }
}

/**
 * Parse flood hazard response from API.
 * Extracts probability and return period from various response formats.
 */
function parseFloodHazardResponse(
  data: Record<string, unknown>,
): FloodHazardResult | null {
  // Try multiple possible response field names
  const probability = extractFloodProbability(data);
  const returnPeriod = extractReturnPeriod(data);

  if (probability === null) {
    return null;
  }

  return {
    probabilityPercent: probability,
    returnPeriodYears: returnPeriod,
    resolutionKm: 1,
    sourceYear: 2023,
    source: "gfms",
  };
}

/**
 * Extract flood probability (0-100%) from API response.
 */
function extractFloodProbability(data: Record<string, unknown>): number | null {
  // Try direct probability field
  if (typeof data.probability === "number") {
    // If returned as decimal (0-1), convert to percentage
    const val = data.probability;
    return val <= 1 ? val * 100 : val;
  }

  // Try percentage field
  if (typeof data.probabilityPercent === "number") {
    return data.probabilityPercent;
  }

  // Try risk_score or hazard_index (often 0-100)
  if (typeof data.risk_score === "number") {
    return data.risk_score;
  }

  // Try nested structure: { flood: { probability: X } }
  if (data.flood && typeof data.flood === "object") {
    const floodObj = data.flood as Record<string, unknown>;
    if (typeof floodObj.probability === "number") {
      const val = floodObj.probability;
      return val <= 1 ? val * 100 : val;
    }
  }

  return null;
}

/**
 * Extract return period in years from API response.
 */
function extractReturnPeriod(data: Record<string, unknown>): number | null {
  if (typeof data.returnPeriodYears === "number") {
    return data.returnPeriodYears;
  }

  if (typeof data.return_period === "number") {
    return data.return_period;
  }

  // If only probability available, estimate return period
  // (rough approximation: P = 1/T for annual exceedance)
  const prob = extractFloodProbability(data);
  if (prob !== null && prob > 0) {
    return Math.round(100 / prob);
  }

  return null;
}
