import { toBoundingBox } from "@/lib/geospatial";
import { fetchClimateSnapshot } from "@/lib/open-meteo";
import {
  buildAmenitySignals,
  fetchNearbyInfrastructure,
  fetchNearbyPlaces,
} from "@/lib/overpass";
import {
  LensAnalysisComputation,
  LensGeometryContext,
  buildMetricRow,
  formatDistanceKm,
  formatElevationFeet,
  nearestMatchingFeature,
  sampleTerrainSnapshot,
  toRiskLevel,
} from "@/lib/analysis/shared";

function buildStopWorthinessScore(args: {
  landmarkCount: number;
  hikeCount: number;
  foodCount: number;
  parkCount: number;
  reliefMeters: number | null;
}) {
  let score = 18;
  score += Math.min(args.landmarkCount * 12, 32);
  score += Math.min(args.hikeCount * 9, 18);
  score += Math.min(args.foodCount * 3, 15);
  score += Math.min(args.parkCount * 4, 12);

  if (typeof args.reliefMeters === "number") {
    if (args.reliefMeters >= 500) score += 18;
    else if (args.reliefMeters >= 200) score += 10;
    else if (args.reliefMeters >= 80) score += 5;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

function classifyStopWorthiness(score: number) {
  if (score >= 75) return "High";
  if (score >= 45) return "Moderate";
  return "Low";
}

export async function analyzeRoadTrip(
  geometryContext: LensGeometryContext,
  locationName: string,
): Promise<LensAnalysisComputation> {
  const searchRadiusKm = Math.max(geometryContext.sampleRadiusKm, 6);
  const [terrain, climateSnapshot, infrastructure, landmarks, hikes, restaurants] =
    await Promise.all([
      sampleTerrainSnapshot(geometryContext.centroid, geometryContext.sampleRadiusKm),
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
      fetchNearbyInfrastructure(toBoundingBox(geometryContext.centroid, searchRadiusKm)).catch(
        () => ({
          elements: [],
        }),
      ),
      fetchNearbyPlaces(geometryContext.centroid, locationName, "landmark").catch(() => []),
      fetchNearbyPlaces(geometryContext.centroid, locationName, "hike").catch(() => []),
      fetchNearbyPlaces(geometryContext.centroid, locationName, "restaurant").catch(() => []),
    ]);

  const elements = infrastructure.elements ?? [];
  const amenitySignals = buildAmenitySignals(elements);
  const nearestRoad = nearestMatchingFeature(
    geometryContext.centroid,
    elements,
    (element) => Boolean(element.tags?.highway),
    "Road access",
  );
  const nearestLandmark = landmarks[0] ?? null;
  const nearestFood = restaurants[0] ?? null;
  const stopWorthinessScore = buildStopWorthinessScore({
    landmarkCount: landmarks.length,
    hikeCount: hikes.length,
    foodCount: amenitySignals.foodAndDrinkCount,
    parkCount: amenitySignals.parkCount,
    reliefMeters: terrain.reliefMeters,
  });
  const stopWorthiness = classifyStopWorthiness(stopWorthinessScore);

  const fallbackNarrative = [
    `${locationName} looks like a ${stopWorthiness.toLowerCase()}-value road trip stop with about ${landmarks.length} mapped landmark${landmarks.length === 1 ? "" : "s"} and ${hikes.length} nearby outdoor stop${hikes.length === 1 ? "" : "s"}.`,
    `Local terrain relief is around ${formatElevationFeet(terrain.reliefMeters)}, which helps indicate whether the stop feels flat and practical or more scenic and dramatic.`,
    nearestFood
      ? `The nearest mapped food stop is ${formatDistanceKm(nearestFood.distanceKm)} away, and direct road access is about ${formatDistanceKm(nearestRoad.distanceKm)} from the center.`
      : `Road access is about ${formatDistanceKm(nearestRoad.distanceKm)} from the center, but no named food stop surfaced in the local search window.`,
    climateSnapshot.climate.weatherRiskSummary
      ? `Current weather context flags ${climateSnapshot.climate.weatherRiskSummary.toLowerCase()}.`
      : "No immediate weather hazard summary was returned for this stop.",
  ].join(" ");

  return {
    title: `${locationName} road trip stop check`,
    metrics: [
      buildMetricRow({
        id: "road-trip-worthiness",
        label: "Stop-worthiness",
        value: `${stopWorthiness} (${stopWorthinessScore}/100)`,
        icon: "route",
        detail: "Derived from scenic cues, stop density, and nearby services.",
        estimated: true,
        riskLevel:
          stopWorthiness === "High"
            ? "low"
            : stopWorthiness === "Moderate"
              ? "moderate"
              : "high",
      }),
      buildMetricRow({
        id: "road-trip-scenery",
        label: "Scenic terrain",
        value: formatElevationFeet(terrain.reliefMeters),
        icon: "mountain",
        detail: "Sampled from local terrain relief around the active place or AOI.",
      }),
      buildMetricRow({
        id: "road-trip-landmarks",
        label: "Nearby landmarks",
        value: `${landmarks.length} mapped`,
        icon: "trail",
        detail:
          nearestLandmark?.name ??
          "No named landmark surfaced in the nearby OSM discovery window.",
        riskLevel:
          landmarks.length >= 4 ? "low" : landmarks.length >= 2 ? "moderate" : "high",
      }),
      buildMetricRow({
        id: "road-trip-services",
        label: "Food and stops",
        value: `${amenitySignals.foodAndDrinkCount} nearby`,
        icon: "road",
        detail: nearestFood
          ? `${nearestFood.name} is ${formatDistanceKm(nearestFood.distanceKm)} away.`
          : "No named nearby dining stop surfaced from OSM.",
        riskLevel: toRiskLevel(amenitySignals.foodAndDrinkCount, {
          low: 2,
          moderate: 1,
          reverse: true,
        }),
      }),
      buildMetricRow({
        id: "road-trip-access",
        label: "Road access",
        value: formatDistanceKm(nearestRoad.distanceKm),
        icon: "road",
        detail: nearestRoad.name,
        riskLevel: toRiskLevel(nearestRoad.distanceKm, { low: 1.5, moderate: 5 }),
      }),
      buildMetricRow({
        id: "road-trip-weather",
        label: "Weather context",
        value: climateSnapshot.climate.weatherRiskSummary ?? "No major weather flag",
        icon: "water",
        detail:
          climateSnapshot.climate.airQualityIndex !== null
            ? `Current AQI ${Math.round(climateSnapshot.climate.airQualityIndex)}.`
            : "Current AQI unavailable for this stop.",
        riskLevel:
          climateSnapshot.climate.weatherRiskSummary || 
          (climateSnapshot.climate.airQualityIndex ?? 0) > 100
            ? "high"
            : (climateSnapshot.climate.airQualityIndex ?? 0) > 60
              ? "moderate"
              : "low",
      }),
    ],
    attribution: [
      "OpenStreetMap via Overpass",
      "USGS / OpenTopo elevation",
      "Open-Meteo forecast and AQI snapshot",
    ],
    promptContext: {
      locationName,
      geometryType: geometryContext.geometryLabel,
      stopWorthinessScore,
      stopWorthiness,
      landmarkCount: landmarks.length,
      hikeCount: hikes.length,
      foodAndDrinkCount: amenitySignals.foodAndDrinkCount,
      parkCount: amenitySignals.parkCount,
      nearestLandmark: nearestLandmark
        ? {
            name: nearestLandmark.name,
            distanceKm: nearestLandmark.distanceKm,
          }
        : null,
      nearestFood: nearestFood
        ? {
            name: nearestFood.name,
            distanceKm: nearestFood.distanceKm,
          }
        : null,
      nearestRoad,
      terrain,
      climate: climateSnapshot.climate,
    },
    fallbackNarrative,
  };
}
