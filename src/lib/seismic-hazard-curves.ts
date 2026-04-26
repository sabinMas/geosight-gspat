import { EXTERNAL_TIMEOUTS, fetchWithTimeout } from "@/lib/network";
import type { SeismicHazardCurvePoint } from "@/lib/seismic-design";

const HAZARD_CURVES_ENDPOINT = "https://earthquake.usgs.gov/hazards/hazardcurves/";

type PairsTuple = [number, number];

type UsgsHazardCurvesResponse = {
  // Format A: nested object with separate x/y arrays
  hazardCurves?: {
    PGA?: { xValues?: number[]; yValues?: number[] };
  };
  // Format B: response wrapper array
  response?: Array<{
    data?: Array<{
      label?: string;
      values?: PairsTuple[];
    }>;
  }>;
  // Format C: curves array (some USGS endpoints)
  curves?: Array<{
    imt?: string;
    xValues?: number[];
    yValues?: number[];
  }>;
};

function toCurvePoints(xVals: number[], yVals: number[]): SeismicHazardCurvePoint[] {
  const points: SeismicHazardCurvePoint[] = [];
  for (let i = 0; i < xVals.length; i++) {
    const pga = xVals[i];
    const annualRate = yVals[i];
    if (
      typeof pga === "number" &&
      typeof annualRate === "number" &&
      pga > 0 &&
      annualRate > 0 &&
      annualRate <= 1
    ) {
      points.push({ pga, annualProb: annualRate, returnPeriodYr: Math.round(1 / annualRate) });
    }
  }
  return points;
}

function fromPairs(pairs: PairsTuple[]): SeismicHazardCurvePoint[] {
  const points: SeismicHazardCurvePoint[] = [];
  for (const [pga, annualRate] of pairs) {
    if (typeof pga === "number" && typeof annualRate === "number" && pga > 0 && annualRate > 0 && annualRate <= 1) {
      points.push({ pga, annualProb: annualRate, returnPeriodYr: Math.round(1 / annualRate) });
    }
  }
  return points;
}

export async function getSeismicHazardCurves(
  lat: number,
  lng: number,
): Promise<SeismicHazardCurvePoint[] | null> {
  try {
    const url = new URL(HAZARD_CURVES_ENDPOINT);
    url.searchParams.set("imt", "PGA");
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lng", String(lng));
    url.searchParams.set("vs30", "259.0"); // Site Class D
    url.searchParams.set("edition", "E2014");
    url.searchParams.set("dataType", "");
    url.searchParams.set("spacing", "0.5");

    const response = await fetchWithTimeout(
      url.toString(),
      { headers: { Accept: "application/json" }, next: { revalidate: 60 * 60 * 24 * 7 } },
      EXTERNAL_TIMEOUTS.standard,
    );

    if (!response.ok) return null;

    const payload = (await response.json()) as UsgsHazardCurvesResponse;

    // Format A: { hazardCurves: { PGA: { xValues, yValues } } }
    const pgaA = payload.hazardCurves?.PGA;
    if (pgaA?.xValues && pgaA?.yValues && pgaA.xValues.length === pgaA.yValues.length) {
      const pts = toCurvePoints(pgaA.xValues, pgaA.yValues);
      if (pts.length >= 3) return pts;
    }

    // Format B: { response: [{ data: [{ label: "Mean", values: [[pga, rate], ...] }] }] }
    const respArr = payload.response;
    if (Array.isArray(respArr) && respArr[0]?.data) {
      const meanSeries = respArr[0].data.find((d) => d.label?.toLowerCase().includes("mean")) ?? respArr[0].data[0];
      if (meanSeries?.values && meanSeries.values.length > 0) {
        const pts = fromPairs(meanSeries.values);
        if (pts.length >= 3) return pts;
      }
    }

    // Format C: { curves: [{ imt: "PGA", xValues, yValues }] }
    if (Array.isArray(payload.curves)) {
      const pgaCurve = payload.curves.find((c) => c.imt === "PGA");
      if (pgaCurve?.xValues && pgaCurve?.yValues && pgaCurve.xValues.length === pgaCurve.yValues.length) {
        const pts = toCurvePoints(pgaCurve.xValues, pgaCurve.yValues);
        if (pts.length >= 3) return pts;
      }
    }

    return null;
  } catch {
    return null;
  }
}
