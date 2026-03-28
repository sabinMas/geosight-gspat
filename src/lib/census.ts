import { Coordinates, GeodataResult } from "@/types";

type FccAreaResponse = {
  results?: Array<{
    county_fips?: string;
    county_name?: string;
    state_code?: string;
  }>;
};

type CensusRow = [string, string, string, string, string, string];

function parseNullableNumber(value: string | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function fetchCountyDemographics(
  coords: Coordinates,
): Promise<GeodataResult["demographics"]> {
  const areaResponse = await fetch(
    `https://geo.fcc.gov/api/census/area?lat=${coords.lat}&lon=${coords.lng}&format=json`,
    {
      next: { revalidate: 60 * 60 * 24 },
    },
  );

  if (!areaResponse.ok) {
    throw new Error("FCC county lookup failed.");
  }

  const areaData = (await areaResponse.json()) as FccAreaResponse;
  const county = areaData.results?.[0];
  const countyFips = county?.county_fips?.slice(-3);
  const stateCode = county?.state_code;

  if (!countyFips || !stateCode) {
    return {
      countyName: county?.county_name ?? null,
      stateCode: stateCode ?? null,
      population: null,
      medianHouseholdIncome: null,
      medianHomeValue: null,
    };
  }

  const censusResponse = await fetch(
    `https://api.census.gov/data/2022/acs/acs5?get=NAME,B01003_001E,B19013_001E,B25077_001E&for=county:${countyFips}&in=state:${stateCode}`,
    {
      next: { revalidate: 60 * 60 * 24 },
    },
  );

  if (!censusResponse.ok) {
    throw new Error("ACS demographics lookup failed.");
  }

  const censusData = (await censusResponse.json()) as [CensusRow, CensusRow?];
  const row = censusData[1];

  return {
    countyName: row?.[0] ?? county.county_name ?? null,
    stateCode,
    population: parseNullableNumber(row?.[1]),
    medianHouseholdIncome: parseNullableNumber(row?.[2]),
    medianHomeValue: parseNullableNumber(row?.[3]),
  };
}
