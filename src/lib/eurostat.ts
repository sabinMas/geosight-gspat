import { EXTERNAL_TIMEOUTS, fetchWithTimeout } from "@/lib/network";
import { BroadbandResult, GeodataResult } from "@/types";

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

export async function fetchEurostatDemographics(
  countryCode: string,
  countryName: string,
): Promise<GeodataResult["demographics"]> {
  const normalizedCountryCode = countryCode.trim().toUpperCase();

  const [population, medianIncome] = await Promise.all([
    fetchLatestEurostatValue("demo_pjan", {
      geo: normalizedCountryCode,
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

  return {
    countyName: countryName,
    stateCode: normalizedCountryCode,
    population: population?.value ?? null,
    medianHouseholdIncome: medianIncome?.value ?? null,
    medianHomeValue: null,
    geographicGranularity: "country",
    populationReferenceYear: population?.year ?? null,
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
