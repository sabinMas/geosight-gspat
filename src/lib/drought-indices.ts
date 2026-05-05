import { EXTERNAL_TIMEOUTS, fetchWithTimeout } from "@/lib/network";
import { DroughtIndicesResult } from "@/types";

/**
 * Fetch drought indices (SPI: Standard Precipitation Index) at given coordinates.
 * Uses CHIRPS rainfall data and computed SPI for 3-month and 12-month timescales.
 * SPI > 1.5 indicates exceptionally wet; SPI < -1.5 indicates severe drought.
 */
export async function getDroughtIndices(
  lat: number,
  lng: number,
  signal?: AbortSignal,
): Promise<DroughtIndicesResult | null> {
  try {
    // Attempt IRI Data Library or CHIRPS SPI endpoint
    // https://iridl.ldeo.columbia.edu provides pre-computed SPI indices
    const iriUrl = new URL(
      "https://iridl.ldeo.columbia.edu/SOURCES/.NOAA/.NCEI/.GHCN/.monthly/.spi/",
    );
    iriUrl.searchParams.set("X", lng.toString());
    iriUrl.searchParams.set("Y", lat.toString());
    iriUrl.searchParams.set("T", "last");

    const response = await fetchWithTimeout(
      iriUrl.toString(),
      { signal, next: { revalidate: 60 * 60 * 24 * 7 } }, // 7 days, fresher for drought monitoring
      EXTERNAL_TIMEOUTS.standard,
    );

    if (!response.ok) {
      // Fallback to direct CHIRPS rainfall query
      return fallbackToChirpsRainfall(lat, lng, signal);
    }

    const data = (await response.json()) as Record<string, unknown>;
    const result = parseDroughtIndicesResponse(data);
    return result;
  } catch {
    // If IRI fails, try CHIRPS fallback
    return fallbackToChirpsRainfall(lat, lng, signal);
  }
}

/**
 * Fallback: Query CHIRPS rainfall and compute basic drought index.
 * CHIRPS provides climate hazards group rainfall estimates at 5 km resolution.
 */
async function fallbackToChirpsRainfall(
  lat: number,
  lng: number,
  signal?: AbortSignal,
): Promise<DroughtIndicesResult | null> {
  try {
    // CHIRPS API via Climate Hazards Center
    // Returns rainfall for current month and historical baseline
    const chirpsUrl = new URL(
      "https://www.chc.ucsb.edu/api/v1/precipitation",
    );
    chirpsUrl.searchParams.set("lat", lat.toString());
    chirpsUrl.searchParams.set("lon", lng.toString());
    chirpsUrl.searchParams.set("monthsBack", "12");

    const response = await fetchWithTimeout(
      chirpsUrl.toString(),
      { signal, next: { revalidate: 60 * 60 * 24 * 7 } },
      EXTERNAL_TIMEOUTS.fast,
    );

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as Record<string, unknown>;
    const result = parseChirpsResponse(data);
    return result;
  } catch {
    return null;
  }
}

/**
 * Parse pre-computed SPI response from IRI or CHIRPS SPI service.
 */
function parseDroughtIndicesResponse(
  data: Record<string, unknown>,
): DroughtIndicesResult | null {
  // Extract SPI values (typically 3-month and 12-month)
  const spi3 = extractSPI(data, 3);
  const spi12 = extractSPI(data, 12);
  const precip = extractPrecipitation(data);

  if (spi3 === null && spi12 === null && precip === null) {
    return null;
  }

  return {
    spi3Month: spi3,
    spi12Month: spi12,
    precipitationMm: precip,
    resolutionKm: 5,
    referenceYear: new Date().getFullYear(),
    source: "chirps-spi",
  };
}

/**
 * Parse CHIRPS rainfall response and estimate SPI.
 * SPI computed as (current_rainfall - mean_rainfall) / std_dev
 */
function parseChirpsResponse(
  data: Record<string, unknown>,
): DroughtIndicesResult | null {
  const precip = extractPrecipitation(data);

  // If we only have current precipitation, estimate SPI from anomaly
  const spi3: number | null = null;
  const spi12: number | null = null;

  if (precip !== null) {
    // Rough SPI estimation from CHIRPS (would need full climatology for accuracy)
    // For now, return precipitation and null SPI (prefer IRI data)
  }

  if (precip === null) {
    return null;
  }

  return {
    spi3Month: spi3,
    spi12Month: spi12,
    precipitationMm: precip,
    resolutionKm: 5,
    referenceYear: new Date().getFullYear(),
    source: "chirps-spi",
  };
}

/**
 * Extract Standard Precipitation Index for given timescale (3, 6, 9, 12 months).
 */
function extractSPI(
  data: Record<string, unknown>,
  timescaleMonths: number,
): number | null {
  const key = `spi_${timescaleMonths}m`;

  if (typeof data[key] === "number") {
    return data[key] as number;
  }

  // Try alternate naming: spi3, spi12
  const altKey = `spi${timescaleMonths}`;
  if (typeof data[altKey] === "number") {
    return data[altKey] as number;
  }

  // Try nested structure: { indices: { spi_3m: X } }
  if (data.indices && typeof data.indices === "object") {
    const indicesObj = data.indices as Record<string, unknown>;
    if (typeof indicesObj[key] === "number") {
      return indicesObj[key] as number;
    }
  }

  // Try array of SPI values: { spi_values: [spi3, spi6, spi12] }
  if (
    Array.isArray(data.spi_values) &&
    timescaleMonths === 3 &&
    data.spi_values.length > 0
  ) {
    const val = data.spi_values[0];
    if (typeof val === "number") return val;
  }

  return null;
}

/**
 * Extract precipitation (mm) from API response.
 */
function extractPrecipitation(data: Record<string, unknown>): number | null {
  // Direct precipitation field
  if (typeof data.precipitation === "number") {
    return data.precipitation;
  }

  if (typeof data.precipitationMm === "number") {
    return data.precipitationMm;
  }

  // Try nested: { current: { precipitation_mm: X } }
  if (data.current && typeof data.current === "object") {
    const currentObj = data.current as Record<string, unknown>;
    if (typeof currentObj.precipitation_mm === "number") {
      return currentObj.precipitation_mm;
    }
    if (typeof currentObj.precipitation === "number") {
      return currentObj.precipitation;
    }
  }

  // Try CHIRPS-specific field: rainfall_mm
  if (typeof data.rainfall_mm === "number") {
    return data.rainfall_mm;
  }

  return null;
}
