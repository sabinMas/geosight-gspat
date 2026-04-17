// @ts-nocheck — depends on AOI/drawing types wired on Phase 5 GIS integration.
import { buildElevationTransect } from "@/lib/geospatial";
import { fetchFireHazardSummary } from "@/lib/nasa-firms";
import { fetchClimateSnapshot } from "@/lib/open-meteo";
import {
  LensAnalysisComputation,
  LensGeometryContext,
  buildElevationProfileFromCoordinates,
  buildMetricRow,
  formatDistanceKm,
  formatElevationFeet,
  formatPercent,
  toRiskLevel,
} from "@/lib/analysis/shared";
import { Coordinates, ElevationProfilePoint } from "@/types";

function summarizeProfile(profile: ElevationProfilePoint[]) {
  const elevations = profile
    .map((point) => point.elevation)
    .filter((value): value is number => typeof value === "number");

  let gainMeters = 0;
  let maxGradePercent = 0;

  for (let index = 1; index < profile.length; index += 1) {
    const previous = profile[index - 1];
    const current = profile[index];
    if (typeof previous?.elevation !== "number" || typeof current?.elevation !== "number") {
      continue;
    }

    const distanceMeters = (current.distanceKm - previous.distanceKm) * 1000;
    if (distanceMeters <= 0) {
      continue;
    }

    const deltaElevation = current.elevation - previous.elevation;
    if (deltaElevation > 0) {
      gainMeters += deltaElevation;
    }

    maxGradePercent = Math.max(maxGradePercent, Math.abs((deltaElevation / distanceMeters) * 100));
  }

  return {
    gainMeters: Math.round(gainMeters),
    maxGradePercent: Number(maxGradePercent.toFixed(1)),
    minElevationMeters: elevations.length ? Math.min(...elevations) : null,
    maxElevationMeters: elevations.length ? Math.max(...elevations) : null,
  };
}

function classifyDifficulty(distanceMiles: number, gainFeet: number) {
  if (distanceMiles <= 3 && gainFeet <= 900) {
    return "Easy";
  }

  if (distanceMiles <= 7 && gainFeet <= 2200) {
    return "Moderate";
  }

  return "Hard";
}

function buildFallbackTrailGeometry(geometryContext: LensGeometryContext): Coordinates[] {
  if (geometryContext.feature?.geometry.type === "LineString") {
    return geometryContext.feature.geometry.coordinates.map(([lng, lat]) => ({ lat, lng }));
  }

  return buildElevationTransect(
    geometryContext.centroid,
    Math.min(Math.max(geometryContext.spanKm, 4), 10),
    8,
    90,
  ).map((point) => point.coordinates);
}

export async function analyzeTrailScout(
  geometryContext: LensGeometryContext,
  locationName: string,
): Promise<LensAnalysisComputation> {
  const routeCoordinates = buildFallbackTrailGeometry(geometryContext);
  const usedEstimatedRoute = geometryContext.feature?.geometry.type !== "LineString";
  const [{ profile, lengthKm }, fireSummary, climateSnapshot] = await Promise.all([
    buildElevationProfileFromCoordinates(routeCoordinates, 14),
    fetchFireHazardSummary(geometryContext.centroid).catch(() => ({
      activeFireCount7d: null,
      nearestFireKm: null,
      maxBrightnessTempK: null,
      dataSource: null,
    })),
    fetchClimateSnapshot(geometryContext.centroid).catch(() => ({
      climate: {
        currentTempC: null,
        averageTempC: null,
        dailyHighTempC: null,
        dailyLowTempC: null,
        coolingDegreeDays: null,
        precipitationMm: null,
        windSpeedKph: null,
        airQualityIndex: null,
        weatherRiskSummary: null,
      },
      forecast: [],
    })),
  ]);

  const profileSummary = summarizeProfile(profile);
  const lengthMiles = lengthKm * 0.621371;
  const gainFeet = profileSummary.gainMeters * 3.28084;
  const averageSlopePercent =
    lengthKm > 0 ? Number(((profileSummary.gainMeters / (lengthKm * 1000)) * 100).toFixed(1)) : null;
  const difficulty = classifyDifficulty(lengthMiles, gainFeet);
  const smokeSummary =
    climateSnapshot.climate.airQualityIndex !== null
      ? `AQI ${Math.round(climateSnapshot.climate.airQualityIndex)}`
      : "AQI unavailable";
  const fireSmokeRisk =
    fireSummary.nearestFireKm !== null && fireSummary.nearestFireKm <= 25
      ? "high"
      : climateSnapshot.climate.airQualityIndex !== null && climateSnapshot.climate.airQualityIndex >= 100
        ? "high"
        : fireSummary.nearestFireKm !== null && fireSummary.nearestFireKm <= 60
          ? "moderate"
          : climateSnapshot.climate.airQualityIndex !== null && climateSnapshot.climate.airQualityIndex >= 60
            ? "moderate"
            : "low";

  const fallbackNarrative = [
    `${locationName} shapes up as a ${difficulty.toLowerCase()} trail outing at about ${lengthMiles.toFixed(1)} miles.`,
    `The sampled profile shows roughly ${formatElevationFeet(profileSummary.gainMeters)} of climbing with a max grade near ${formatPercent(profileSummary.maxGradePercent)}.`,
    usedEstimatedRoute
      ? "Because the active AOI was not a drawn route, the elevation profile was estimated across the area rather than along a specific trail line."
      : "The profile is based on the drawn or recorded route geometry.",
    fireSummary.nearestFireKm !== null
      ? `NASA FIRMS places the nearest recent fire detection about ${formatDistanceKm(fireSummary.nearestFireKm)} away, and current air context is ${smokeSummary.toLowerCase()}.`
      : `Fire context is temporarily unavailable, but the current air signal reads ${smokeSummary.toLowerCase()}.`,
  ].join(" ");

  return {
    title: `${locationName} trail scout`,
    metrics: [
      buildMetricRow({
        id: "trail-distance",
        label: "Trail distance",
        value: `${lengthMiles.toFixed(1)} mi`,
        icon: "route",
        detail: usedEstimatedRoute ? "Estimated across the AOI footprint." : "Measured from the route geometry.",
        estimated: usedEstimatedRoute,
      }),
      buildMetricRow({
        id: "trail-gain",
        label: "Elevation gain",
        value: formatElevationFeet(profileSummary.gainMeters),
        icon: "mountain",
        detail: `Range ${formatElevationFeet(profileSummary.minElevationMeters)} to ${formatElevationFeet(profileSummary.maxElevationMeters)}.`,
      }),
      buildMetricRow({
        id: "trail-slope",
        label: "Average slope",
        value: formatPercent(averageSlopePercent),
        icon: "slope",
        detail: "Computed from cumulative gain divided by total route length.",
        riskLevel: toRiskLevel(averageSlopePercent, { low: 5, moderate: 10 }),
      }),
      buildMetricRow({
        id: "trail-max-grade",
        label: "Max grade",
        value: formatPercent(profileSummary.maxGradePercent),
        icon: "grade",
        detail: "Steepest sampled segment along the route.",
        riskLevel: toRiskLevel(profileSummary.maxGradePercent, { low: 12, moderate: 20 }),
      }),
      buildMetricRow({
        id: "trail-difficulty",
        label: "Estimated difficulty",
        value: difficulty,
        icon: "difficulty",
        detail: "Based on total mileage and elevation gain.",
        estimated: true,
        riskLevel:
          difficulty === "Hard" ? "high" : difficulty === "Moderate" ? "moderate" : "low",
      }),
      buildMetricRow({
        id: "trail-fire-smoke",
        label: "Fire / smoke context",
        value:
          fireSummary.nearestFireKm !== null
            ? `${formatDistanceKm(fireSummary.nearestFireKm)} fire proximity, ${smokeSummary}`
            : `Fire data unavailable, ${smokeSummary}`,
        icon: "fire",
        detail:
          fireSummary.activeFireCount7d !== null
            ? `${fireSummary.activeFireCount7d} detections in the last 7 days near the route region.`
            : "NASA FIRMS detections unavailable for this request.",
        riskLevel: fireSmokeRisk,
      }),
    ],
    attribution: [
      "USGS / OpenTopo elevation sampling",
      "NASA FIRMS active fire detections",
      "Open-Meteo air quality snapshot",
    ],
    details: {
      elevationProfile: profile,
      elevationProfileEstimated: usedEstimatedRoute,
      distanceMiles: Number(lengthMiles.toFixed(2)),
      difficulty,
    },
    promptContext: {
      locationName,
      geometryType: geometryContext.geometryLabel,
      distanceMiles: Number(lengthMiles.toFixed(2)),
      gainFeet: Math.round(gainFeet),
      maxGradePercent: profileSummary.maxGradePercent,
      averageSlopePercent,
      difficulty,
      fireSummary,
      airQualityIndex: climateSnapshot.climate.airQualityIndex,
      routeEstimated: usedEstimatedRoute,
    },
    fallbackNarrative,
  };
}
