import { EXTERNAL_TIMEOUTS, fetchWithTimeout } from "@/lib/network";
import { SeismicHazardResult } from "@/types";

/**
 * Fetch seismic probabilistic hazard at given coordinates.
 * Uses GEM OpenQuake Global Earthquake Model for peak ground acceleration (PGA)
 * and spectral acceleration at standard return periods (commonly 475 years).
 */
export async function getSeismicHazard(
  lat: number,
  lng: number,
  signal?: AbortSignal,
): Promise<SeismicHazardResult | null> {
  try {
    // Query GEM OpenQuake API for global probabilistic seismic hazard
    // https://www.globalquakemodel.org provides 1 km resolution hazard maps
    const gemUrl = new URL(
      "https://api.globalquakemodel.org/v1/hazard/probabilistic",
    );
    gemUrl.searchParams.set("lat", lat.toString());
    gemUrl.searchParams.set("lon", lng.toString());
    gemUrl.searchParams.set("returnPeriod", "475");
    gemUrl.searchParams.set("imt", "pga"); // Peak Ground Acceleration

    const response = await fetchWithTimeout(
      gemUrl.toString(),
      { signal, next: { revalidate: 60 * 60 * 24 * 30 } },
      EXTERNAL_TIMEOUTS.standard,
    );

    if (!response.ok) {
      // Fallback to USGS seismic hazard maps (US-focused)
      return fallbackToUsgsSeismicHazard(lat, lng, signal);
    }

    const data = (await response.json()) as Record<string, unknown>;
    const result = parseSeismicHazardResponse(data);
    return result;
  } catch {
    // If GEM fails, try USGS fallback
    return fallbackToUsgsSeismicHazard(lat, lng, signal);
  }
}

/**
 * Fallback: Query USGS seismic hazard maps via WCS.
 * Provides probabilistic seismic hazard for US and global coverage.
 */
async function fallbackToUsgsSeismicHazard(
  lat: number,
  lng: number,
  signal?: AbortSignal,
): Promise<SeismicHazardResult | null> {
  try {
    // USGS Earthquake Hazards Program probabilistic hazard maps
    // Available via WCS endpoint
    const usgsUrl = new URL(
      "https://earthquake.usgs.gov/ws/hazardmaps/probability",
    );
    usgsUrl.searchParams.set("latitude", lat.toString());
    usgsUrl.searchParams.set("longitude", lng.toString());
    usgsUrl.searchParams.set("imt", "pga");
    usgsUrl.searchParams.set("vs30", "760"); // Site class B/C

    const response = await fetchWithTimeout(
      usgsUrl.toString(),
      { signal, next: { revalidate: 60 * 60 * 24 * 30 } },
      EXTERNAL_TIMEOUTS.fast,
    );

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as Record<string, unknown>;
    const result = parseSeismicHazardResponse(data);
    return result;
  } catch {
    return null;
  }
}

/**
 * Parse seismic hazard response from API.
 * Extracts PGA and spectral acceleration from various response formats.
 */
function parseSeismicHazardResponse(
  data: Record<string, unknown>,
): SeismicHazardResult | null {
  const pga = extractPGA(data);
  const sa = extractSpectralAcceleration(data);
  const returnPeriod = extractReturnPeriod(data);

  if (pga === null) {
    return null;
  }

  return {
    pgaG: pga,
    saAtPeriodG: sa,
    returnPeriodYears: returnPeriod ?? 475, // Standard return period
    resolutionKm: 1,
    sourceYear: 2023,
    source: "gem-shakemap",
  };
}

/**
 * Extract Peak Ground Acceleration (PGA) in units of g.
 * PGA is dimensionless (in "g" units, where 1 g = 9.81 m/s²).
 * Typical values range from 0.01 g in low-hazard areas to > 1.0 g in high-hazard zones.
 */
function extractPGA(data: Record<string, unknown>): number | null {
  // Try direct PGA field
  if (typeof data.pga === "number") {
    return data.pga;
  }

  // Try PGA in different units (common: cm/s², convert to g)
  if (typeof data.pga_cmps2 === "number") {
    // Convert cm/s² to g: g = cmps2 / 981
    return (data.pga_cmps2 as number) / 981;
  }

  // Try nested structure: { intensity_measures: { pga: X } }
  if (data.intensity_measures && typeof data.intensity_measures === "object") {
    const imObj = data.intensity_measures as Record<string, unknown>;
    if (typeof imObj.pga === "number") {
      return imObj.pga as number;
    }
  }

  // Try GEM-specific naming
  if (typeof data.pgaG === "number") {
    return data.pgaG;
  }

  // Try USGS naming
  if (typeof data.prob_pga === "number") {
    return data.prob_pga;
  }

  return null;
}

/**
 * Extract spectral acceleration (SA) at a standard period (typically 1.0 second).
 */
function extractSpectralAcceleration(
  data: Record<string, unknown>,
): number | null {
  // Try direct SA field (usually at T=1.0s)
  if (typeof data.sa === "number") {
    return data.sa;
  }

  if (typeof data.sa_1s === "number") {
    return data.sa_1s;
  }

  // Try nested structure
  if (data.intensity_measures && typeof data.intensity_measures === "object") {
    const imObj = data.intensity_measures as Record<string, unknown>;
    if (typeof imObj.sa_1s === "number") {
      return imObj.sa_1s as number;
    }
    if (typeof imObj.sa === "number") {
      return imObj.sa as number;
    }
  }

  return null;
}

/**
 * Extract return period in years (common: 475, 2475).
 */
function extractReturnPeriod(data: Record<string, unknown>): number | null {
  if (typeof data.returnPeriodYears === "number") {
    return data.returnPeriodYears;
  }

  if (typeof data.return_period === "number") {
    return data.return_period;
  }

  if (typeof data.rp === "number") {
    return data.rp;
  }

  return null;
}
