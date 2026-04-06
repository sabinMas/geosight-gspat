import { EXTERNAL_TIMEOUTS, fetchWithTimeout } from "@/lib/network";
import { BroadbandResult, Coordinates, GeodataResult } from "@/types";

const EUROSTAT_BASE_URL =
  "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data";

const EUROSTAT_COUNTRY_CODES = new Set([
  "AT",
  "BE",
  "BG",
  "CH",
  "CY",
  "CZ",
  "DE",
  "DK",
  "EE",
  "ES",
  "FI",
  "FR",
  "GR",
  "HR",
  "HU",
  "IE",
  "IS",
  "IT",
  "LT",
  "LU",
  "LV",
  "MT",
  "NL",
  "NO",
  "PL",
  "PT",
  "RO",
  "SE",
  "SI",
  "SK",
]);

type EurostatDatasetResponse = {
  value?: Record<string, number>;
  status?: Record<string, string>;
  dimension?: {
    time?: {
      category?: {
        index?: Record<string, number>;
      };
    };
  };
};

function buildUrl(dataset: string, params: Record<string, string>) {
  const searchParams = new URLSearchParams(params);
  return `${EUROSTAT_BASE_URL}/${dataset}?${searchParams.toString()}`;
}

function parseLatestObservation(payload: EurostatDatasetResponse) {
  const timeIndex = payload.dimension?.time?.category?.index;
  if (!timeIndex) {
    return null;
  }

  const entries = Object.entries(timeIndex).sort((left, right) => right[1] - left[1]);
  for (const [yearLabel, position] of entries) {
    const value = payload.value?.[String(position)];
    if (typeof value === "number" && Number.isFinite(value)) {
      const year = Number(yearLabel);
      return {
        value,
        year: Number.isFinite(year) ? year : null,
        status: payload.status?.[String(position)] ?? null,
      };
    }
  }

  return null;
}

async function fetchLatestEurostatValue(dataset: string, params: Record<string, string>) {
  const response = await fetchWithTimeout(
    buildUrl(dataset, params),
    {
      headers: {
        Accept: "application/json",
      },
      next: { revalidate: 60 * 60 * 24 },
    },
    EXTERNAL_TIMEOUTS.standard,
  );

  if (!response.ok) {
    throw new Error(`Eurostat request failed for ${dataset}.`);
  }

  const payload = (await response.json()) as EurostatDatasetResponse;
  return parseLatestObservation(payload);
}

export function supportsEurostatCountry(countryCode: string | null | undefined) {
  return Boolean(countryCode && EUROSTAT_COUNTRY_CODES.has(countryCode.toUpperCase()));
}

type GiscoReverseResponse = {
  features?: Array<{
    properties?: {
      nuts?: {
        NUTS2?: { code?: string; name?: string };
      };
    };
  }>;
};

async function fetchGiscoNuts2(coords: Coordinates) {
  try {
    const url = `https://gisco-services.ec.europa.eu/api/?q=&lat=${coords.lat}&lon=${coords.lng}&lang=en&limit=1`;
    const response = await fetchWithTimeout(
      url,
      { next: { revalidate: 60 * 60 * 24 } },
      EXTERNAL_TIMEOUTS.fast,
    );
    if (!response.ok) return null;
    const payload = (await response.json()) as GiscoReverseResponse;
    const nuts2 = payload.features?.[0]?.properties?.nuts?.NUTS2;
    if (!nuts2?.code) return null;
    return { code: nuts2.code, name: nuts2.name ?? nuts2.code };
  } catch {
    return null;
  }
}

export async function fetchEurostatDemographics(
  countryCode: string,
  countryName: string,
  coords?: Coordinates,
): Promise<GeodataResult["demographics"]> {
  const normalizedCountryCode = countryCode.trim().toUpperCase();

  // Try to resolve a NUTS2 region for sub-national granularity
  const nuts2 = coords ? await fetchGiscoNuts2(coords) : null;
  const geoCode = nuts2 ? nuts2.code : normalizedCountryCode;

  const [population, medianIncome] = await Promise.all([
    fetchLatestEurostatValue("demo_pjan", {
      geo: geoCode,
      sex: "T",
      age: "TOTAL",
      unit: "NR",
    }).catch(() => null),
    fetchLatestEurostatValue("ilc_di03", {
      geo: normalizedCountryCode,
      age: "TOTAL",
      sex: "T",
      indic_il: "MED_E",
      unit: "EUR",
    }).catch(() => null),
  ]);

  // If NUTS2 population lookup failed, fall back to country level
  const resolvedPopulation =
    population ??
    (nuts2
      ? await fetchLatestEurostatValue("demo_pjan", {
          geo: normalizedCountryCode,
          sex: "T",
          age: "TOTAL",
          unit: "NR",
        }).catch(() => null)
      : null);

  const granularity: GeodataResult["demographics"]["geographicGranularity"] =
    nuts2 && population ? "nuts2_region" : "country";

  return {
    countyName: nuts2 && population ? nuts2.name : countryName,
    stateCode: nuts2 ? nuts2.code : normalizedCountryCode,
    population: resolvedPopulation?.value ?? null,
    medianHouseholdIncome: medianIncome?.value ?? null,
    medianHomeValue: null,
    geographicGranularity: granularity,
    populationReferenceYear: resolvedPopulation?.year ?? null,
    incomeReferenceYear: medianIncome?.year ?? null,
    incomeDefinition: medianIncome
      ? "Eurostat median equivalised net income"
      : null,
  };
}

export async function fetchEurostatBroadbandBaseline(
  countryCode: string,
  countryName: string,
): Promise<BroadbandResult | null> {
  const normalizedCountryCode = countryCode.trim().toUpperCase();

  const [fixedBroadband, mobileBroadband] = await Promise.all([
    fetchLatestEurostatValue("isoc_ci_it_h", {
      geo: normalizedCountryCode,
      indic_is: "H_BBFIX",
      unit: "PC_HH",
      hhtyp: "TOTAL",
    }).catch(() => null),
    fetchLatestEurostatValue("isoc_ci_it_h", {
      geo: normalizedCountryCode,
      indic_is: "H_BBMOB",
      unit: "PC_HH",
      hhtyp: "TOTAL",
    }).catch(() => null),
  ]);

  if (!fixedBroadband && !mobileBroadband) {
    return null;
  }

  return {
    kind: "regional_household_baseline",
    granularity: "country",
    regionLabel: countryName,
    referenceYear:
      fixedBroadband?.year ?? mobileBroadband?.year ?? null,
    maxDownloadSpeed: 0,
    maxUploadSpeed: 0,
    providerCount: 0,
    technologies: ["fixed_broadband_share", "mobile_broadband_share"],
    hasFiber: false,
    fixedBroadbandCoveragePercent: fixedBroadband?.value ?? null,
    mobileBroadbandCoveragePercent: mobileBroadband?.value ?? null,
  };
}
