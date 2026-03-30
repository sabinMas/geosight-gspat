import { GeodataResult, StreamGaugeResult } from "@/types";

function isFiniteDistanceKm(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

export function sanitizeStreamGauges(
  streamGauges: StreamGaugeResult[] | null | undefined,
): StreamGaugeResult[] {
  return (streamGauges ?? [])
    .filter(
      (gauge): gauge is StreamGaugeResult =>
        Boolean(gauge) &&
        typeof gauge.siteNumber === "string" &&
        gauge.siteNumber.trim().length > 0 &&
        typeof gauge.siteName === "string" &&
        gauge.siteName.trim().length > 0 &&
        isFiniteDistanceKm(gauge.distanceKm),
    )
    .sort((left, right) => left.distanceKm - right.distanceKm);
}

export function getNearestStreamGauge(
  geodata: Pick<GeodataResult, "streamGauges"> | null | undefined,
): StreamGaugeResult | null {
  return sanitizeStreamGauges(geodata?.streamGauges)[0] ?? null;
}

export function formatDistanceKm(
  value: number | null | undefined,
  fallback: string = "distance unavailable",
) {
  return typeof value === "number" && Number.isFinite(value) ? `${value.toFixed(1)} km` : fallback;
}
