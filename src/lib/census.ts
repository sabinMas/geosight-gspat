import { Coordinates, GeodataResult } from "@/types";
import { EXTERNAL_TIMEOUTS, fetchWithTimeout } from "@/lib/network";

type FccAreaResponse = {
  results?: Array<{
    county_fips?: string;
    county_name?: string;
    state_code?: string;
    state_fips?: string;
  }>;
};

type CensusRow = [string, string, string, string, string, string];

type NominatimReverseResponse = {
  address?: {
    country_code?: string;
    country?: string;
  };
};

type WorldBankIndicatorResponse = [
  { page?: number; total?: number },
  Array<{
    value?: number | null;
    date?: string;
    countryiso3code?: string;
  }>?,
];

function parseNullableNumber(value: string | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isLikelyUsCoordinate(coords: Coordinates) {
  return coords.lat >= 18 && coords.lat <= 72 && coords.lng >= -180 && coords.lng <= -64;
}

async function reverseGeocodeCountry(coords: Coordinates) {
  const response = await fetchWithTimeout(
    `https://nominatim.openstreetmap.org/reverse?lat=${coords.lat}&lon=${coords.lng}&format=jsonv2&zoom=3&addressdetails=1`,
    {
      headers: {
        "Accept-Language": "en",
      "User-Agent": "GeoSight geospatial",
      },
      next: { revalidate: 60 * 60 * 24 },
    },
    EXTERNAL_TIMEOUTS.standard,
  );

  if (!response.ok) {
    throw new Error("Reverse geocode failed.");
  }

  const payload = (await response.json()) as NominatimReverseResponse;
  const countryCode = payload.address?.country_code?.toUpperCase() ?? null;
  const countryName = payload.address?.country ?? null;

  if (!countryCode || !countryName) {
    return null;
  }

  return { countryCode, countryName };
}

async function fetchWorldBankIndicator(countryIso2: string, indicator: string) {
  const response = await fetchWithTimeout(
    `https://api.worldbank.org/v2/country/${countryIso2}/indicator/${indicator}?format=json&mrv=1&per_page=1`,
    {
      next: { revalidate: 60 * 60 * 24 },
    },
    EXTERNAL_TIMEOUTS.fast,
  );

  if (!response.ok) {
    throw new Error(`World Bank indicator lookup failed for ${indicator}.`);
  }

  const payload = (await response.json()) as WorldBankIndicatorResponse;
  const value = payload[1]?.[0]?.value;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

async function fetchGlobalDemographics(coords: Coordinates): Promise<GeodataResult["demographics"]> {
  try {
    const country = await reverseGeocodeCountry(coords);
    if (!country) {
      return {
        countyName: null,
        stateCode: null,
        population: null,
        medianHouseholdIncome: null,
        medianHomeValue: null,
      };
    }

    const [population, gniPerCapita] = await Promise.all([
      fetchWorldBankIndicator(country.countryCode, "SP.POP.TOTL").catch(() => null),
      fetchWorldBankIndicator(country.countryCode, "NY.GNP.PCAP.CD").catch(() => null),
    ]);

    return {
      countyName: country.countryName,
      stateCode: country.countryCode,
      population,
      medianHouseholdIncome: gniPerCapita,
      medianHomeValue: null,
    };
  } catch {
    return {
      countyName: null,
      stateCode: null,
      population: null,
      medianHouseholdIncome: null,
      medianHomeValue: null,
    };
  }
}

export async function fetchCountyDemographics(
  coords: Coordinates,
): Promise<GeodataResult["demographics"]> {
  if (!isLikelyUsCoordinate(coords)) {
    return fetchGlobalDemographics(coords);
  }

  const areaResponse = await fetchWithTimeout(
    `https://geo.fcc.gov/api/census/area?lat=${coords.lat}&lon=${coords.lng}&format=json`,
    {
      next: { revalidate: 60 * 60 * 24 },
    },
    EXTERNAL_TIMEOUTS.fast,
  );

  if (!areaResponse.ok) {
    throw new Error("FCC county lookup failed.");
  }

  const areaData = (await areaResponse.json()) as FccAreaResponse;
  const county = areaData.results?.[0];
  const countyFips = county?.county_fips?.slice(-3);
  const stateCode = county?.state_code;
  const stateFips = county?.state_fips;

  if (!countyFips || !stateFips) {
    return {
      countyName: county?.county_name ?? null,
      stateCode: stateCode ?? null,
      population: null,
      medianHouseholdIncome: null,
      medianHomeValue: null,
    };
  }

  const censusResponse = await fetchWithTimeout(
    `https://api.census.gov/data/2022/acs/acs5?get=NAME,B01003_001E,B19013_001E,B25077_001E&for=county:${countyFips}&in=state:${stateFips}`,
    {
      next: { revalidate: 60 * 60 * 24 },
    },
    EXTERNAL_TIMEOUTS.fast,
  );

  if (!censusResponse.ok) {
    throw new Error("ACS demographics lookup failed.");
  }

  const censusData = (await censusResponse.json()) as [CensusRow, CensusRow?];
  const row = censusData[1];

  return {
    countyName: row?.[0] ?? county.county_name ?? null,
    stateCode: stateCode ?? null,
    population: parseNullableNumber(row?.[1]),
    medianHouseholdIncome: parseNullableNumber(row?.[2]),
    medianHomeValue: parseNullableNumber(row?.[3]),
  };
}
