import { Coordinates } from "@/types";
import { EXTERNAL_TIMEOUTS, fetchWithTimeout } from "@/lib/network";

export interface SolarResourceResult {
  /** Annual average GHI — all-sky irradiance, kWh/m²/day */
  annualGhiKwhM2Day: number | null;
  /** Annual average clear-sky GHI, kWh/m²/day */
  clearSkyGhiKwhM2Day: number | null;
  /** Annual average clearness index (0–1) — actual / clear-sky ratio */
  clearnessIndex: number | null;
  /** Peak sun hours per day (equals annualGhiKwhM2Day numerically) */
  peakSunHours: number | null;
  /** Monthly GHI values Jan–Dec, kWh/m²/day */
  monthlyGhi: number[];
  /** Best month label (e.g. "Jul") */
  bestMonth: string | null;
  /** Worst month label */
  worstMonth: string | null;
  /** Best month GHI */
  bestMonthGhi: number | null;
  /** Worst month GHI */
  worstMonthGhi: number | null;
  /** Annual average UV Index (0–16+) */
  annualUvIndex: number | null;
  /** Monthly UV Index values Jan–Dec */
  monthlyUvIndex: number[];
}

type NasaPowerClimatologyResponse = {
  properties?: {
    parameter?: {
      ALLSKY_SFC_SW_DWN?: Record<string, number>;
      CLRSKY_SFC_SW_DWN?: Record<string, number>;
      ALLSKY_KT?: Record<string, number>;
      ALLSKY_SFC_UV_INDEX?: Record<string, number>;
    };
  };
};

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function parseParam(record: Record<string, number> | undefined, key: string): number | null {
  if (!record) return null;
  const val = record[key];
  // NASA POWER uses -999 as a fill value for missing data
  return typeof val === "number" && val > -900 ? Number(val.toFixed(2)) : null;
}

export async function getSolarResource(coords: Coordinates): Promise<SolarResourceResult> {
  const { lat, lng } = coords;
  const params = new URLSearchParams({
    parameters: "ALLSKY_SFC_SW_DWN,CLRSKY_SFC_SW_DWN,ALLSKY_KT,ALLSKY_SFC_UV_INDEX",
    community: "RE",
    longitude: lng.toFixed(4),
    latitude: lat.toFixed(4),
    format: "JSON",
  });

  const url = `https://power.larc.nasa.gov/api/temporal/climatology/point?${params}`;
  const response = await fetchWithTimeout(url, { next: { revalidate: 60 * 60 * 24 * 7 } }, EXTERNAL_TIMEOUTS.standard);

  if (!response.ok) {
    throw new Error(`NASA POWER returned ${response.status}`);
  }

  const json = (await response.json()) as NasaPowerClimatologyResponse;
  const allsky = json.properties?.parameter?.ALLSKY_SFC_SW_DWN;
  const clearsky = json.properties?.parameter?.CLRSKY_SFC_SW_DWN;
  const kt = json.properties?.parameter?.ALLSKY_KT;
  const uv = json.properties?.parameter?.ALLSKY_SFC_UV_INDEX;

  // ANN key = annual average; 01–12 = monthly averages
  const annualGhi = parseParam(allsky, "ANN");
  const annualClearSky = parseParam(clearsky, "ANN");
  const annualKt = parseParam(kt, "ANN");
  const annualUv = parseParam(uv, "ANN");

  const monthlyGhi: number[] = [];
  const monthlyUvIndex: number[] = [];
  for (let m = 1; m <= 12; m++) {
    const key = String(m).padStart(2, "0");
    const ghiVal = parseParam(allsky, key);
    if (ghiVal !== null) monthlyGhi.push(ghiVal);
    const uvVal = parseParam(uv, key);
    if (uvVal !== null) monthlyUvIndex.push(uvVal);
  }

  const annualUvIndex = annualUv;
  let bestMonth: string | null = null;
  let worstMonth: string | null = null;
  let bestMonthGhi: number | null = null;
  let worstMonthGhi: number | null = null;

  if (monthlyGhi.length === 12) {
    const maxIdx = monthlyGhi.indexOf(Math.max(...monthlyGhi));
    const minIdx = monthlyGhi.indexOf(Math.min(...monthlyGhi));
    bestMonth = MONTH_LABELS[maxIdx];
    worstMonth = MONTH_LABELS[minIdx];
    bestMonthGhi = monthlyGhi[maxIdx];
    worstMonthGhi = monthlyGhi[minIdx];
  }

  return {
    annualGhiKwhM2Day: annualGhi,
    clearSkyGhiKwhM2Day: annualClearSky,
    clearnessIndex: annualKt,
    peakSunHours: annualGhi, // numerically identical: 1 kWh/m²/day = 1 peak sun hour
    monthlyGhi,
    bestMonth,
    worstMonth,
    bestMonthGhi,
    worstMonthGhi,
    annualUvIndex,
    monthlyUvIndex,
  };
}
