import { clamp } from "@/lib/utils";
import { GeodataResult, LandCoverBucket, SiteFactorScore, SiteScore } from "@/types";

function scoreFromDistance(distanceKm: number | null, idealKm: number, cutoffKm: number) {
  if (distanceKm === null) {
    return 50;
  }

  if (distanceKm <= idealKm) {
    return 100;
  }

  if (distanceKm >= cutoffKm) {
    return 15;
  }

  const ratio = 1 - (distanceKm - idealKm) / (cutoffKm - idealKm);
  return clamp(Math.round(ratio * 100), 15, 100);
}

function scoreTerrain(elevation: number | null) {
  if (elevation === null) {
    return 55;
  }

  if (elevation < 120) {
    return 90;
  }

  if (elevation < 260) {
    return 74;
  }

  if (elevation < 500) {
    return 48;
  }

  return 30;
}

function scoreClimate(tempC: number | null, coolingDegreeDays: number | null) {
  if (tempC === null || coolingDegreeDays === null) {
    return 60;
  }

  const tempScore = clamp(100 - Math.abs(tempC - 12) * 8, 25, 100);
  const cddScore = clamp(100 - coolingDegreeDays / 4, 20, 100);
  return Math.round(tempScore * 0.55 + cddScore * 0.45);
}

function scoreLandCover(classification: LandCoverBucket[]) {
  if (!classification.length) {
    return 50;
  }

  const lookup = Object.fromEntries(
    classification.map((bucket) => [bucket.label.toLowerCase(), bucket.value]),
  );
  const preferred =
    (lookup["barren"] ?? 0) +
    (lookup["barren/industrial"] ?? 0) +
    (lookup["urban"] ?? 0) * 0.8;
  const constrained =
    (lookup["vegetation"] ?? 0) * 0.8 +
    (lookup["forest"] ?? 0) +
    (lookup["agricultural"] ?? 0) * 0.9 +
    (lookup["water"] ?? 0) * 0.7;

  return clamp(Math.round(60 + preferred * 0.8 - constrained * 0.45), 10, 100);
}

export function buildFactorScores(geodata: GeodataResult): SiteFactorScore[] {
  return [
    {
      key: "waterProximity",
      label: "Water source proximity",
      score: scoreFromDistance(geodata.nearestWaterBody.distanceKm, 1, 15),
      weight: 0.3,
      detail: `${geodata.nearestWaterBody.name} at ${
        geodata.nearestWaterBody.distanceKm === null
          ? "unknown distance"
          : `${geodata.nearestWaterBody.distanceKm.toFixed(1)} km`
      }.`,
    },
    {
      key: "terrain",
      label: "Elevation & flatness",
      score: scoreTerrain(geodata.elevationMeters),
      weight: 0.15,
      detail: geodata.elevationMeters === null ? "Elevation unavailable." : `Elevation ${geodata.elevationMeters} m.`,
    },
    {
      key: "powerInfrastructure",
      label: "Power infrastructure",
      score: scoreFromDistance(geodata.nearestPower.distanceKm, 2, 20),
      weight: 0.2,
      detail: `${geodata.nearestPower.name} at ${
        geodata.nearestPower.distanceKm === null ? "unknown distance" : `${geodata.nearestPower.distanceKm.toFixed(1)} km`
      }.`,
    },
    {
      key: "climate",
      label: "Climate suitability",
      score: scoreClimate(geodata.climate.averageTempC, geodata.climate.coolingDegreeDays),
      weight: 0.15,
      detail: `Avg ${geodata.climate.averageTempC ?? "?"} C, CDD ${geodata.climate.coolingDegreeDays ?? "?"}.`,
    },
    {
      key: "transportation",
      label: "Road transportation",
      score: scoreFromDistance(geodata.nearestRoad.distanceKm, 2, 18),
      weight: 0.1,
      detail: `${geodata.nearestRoad.name} at ${
        geodata.nearestRoad.distanceKm === null ? "unknown distance" : `${geodata.nearestRoad.distanceKm.toFixed(1)} km`
      }.`,
    },
    {
      key: "landClassification",
      label: "Land classification",
      score: scoreLandCover(geodata.landClassification),
      weight: 0.1,
      detail: "Higher scores favor barren, industrial, and already-developed parcels.",
    },
  ];
}

export function calculateSiteScore(geodata: GeodataResult): SiteScore {
  const factors = buildFactorScores(geodata);
  const total = Math.round(
    factors.reduce((acc, factor) => acc + factor.score * factor.weight, 0),
  );

  const recommendation =
    total >= 85
      ? "Excellent cooling-center candidate with low-friction infrastructure alignment."
      : total >= 70
        ? "Promising site with a few constraints to validate in due diligence."
        : total >= 55
          ? "Viable only if specific permitting, grading, or utility issues are solved."
          : "Weak cooling-center fit compared with the preloaded Pacific Northwest benchmarks.";

  return { total, recommendation, factors };
}
