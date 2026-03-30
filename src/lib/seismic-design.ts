import { EXTERNAL_TIMEOUTS, fetchWithTimeout } from "@/lib/network";
import { Coordinates } from "@/types";

export interface SeismicDesignParams {
  ss: number | null;
  s1: number | null;
  siteClass: string | null;
  riskCategory: string | null;
  pga: number | null;
  dataSource: string;
}

const USGS_DESIGN_MAPS_ENDPOINT =
  "https://earthquake.usgs.gov/ws/designmaps/asce7-22.json";
const DATA_SOURCE = "ASCE 7-22 via USGS";
const NULL_SEISMIC_PARAMS: SeismicDesignParams = {
  ss: null,
  s1: null,
  siteClass: null,
  riskCategory: null,
  pga: null,
  dataSource: DATA_SOURCE,
};

type SeismicDesignResponse = {
  request?: {
    status?: string;
    parameters?: {
      siteClass?: string;
      riskCategory?: string;
    };
  };
  response?: {
    data?: {
      ss?: number | null;
      s1?: number | null;
      pga?: number | null;
      pgam?: number | null;
      siteClass?: string | null;
      sdc?: string | null;
    };
  } | string;
};

function parseNullableNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export async function getSeismicDesignParams(
  coords: Coordinates,
): Promise<SeismicDesignParams> {
  try {
    const url = new URL(USGS_DESIGN_MAPS_ENDPOINT);
    url.searchParams.set("latitude", String(coords.lat));
    url.searchParams.set("longitude", String(coords.lng));
    url.searchParams.set("riskCategory", "II");
    url.searchParams.set("siteClass", "D");
    url.searchParams.set("title", "GeoSight");

    const response = await fetchWithTimeout(
      url.toString(),
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 60 * 60 * 24 },
      },
      EXTERNAL_TIMEOUTS.standard,
    );

    if (!response.ok) {
      return NULL_SEISMIC_PARAMS;
    }

    const payload = (await response.json()) as SeismicDesignResponse;
    const data =
      payload.response && typeof payload.response === "object"
        ? payload.response.data
        : undefined;

    if (payload.request?.status !== "success" || !data) {
      return NULL_SEISMIC_PARAMS;
    }

    return {
      ss: parseNullableNumber(data.ss),
      s1: parseNullableNumber(data.s1),
      siteClass:
        (typeof data.siteClass === "string" && data.siteClass.trim()) ||
        (typeof payload.request?.parameters?.siteClass === "string" &&
          payload.request.parameters.siteClass.trim()) ||
        null,
      riskCategory:
        (typeof payload.request?.parameters?.riskCategory === "string" &&
          payload.request.parameters.riskCategory.trim()) ||
        null,
      pga: parseNullableNumber(data.pga) ?? parseNullableNumber(data.pgam),
      dataSource: DATA_SOURCE,
    };
  } catch {
    return NULL_SEISMIC_PARAMS;
  }
}
