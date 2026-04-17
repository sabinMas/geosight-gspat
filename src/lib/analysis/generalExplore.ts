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

function buildInterestScore(args: {
  landmarkCount: number;
  trailheadCount: number;
  parkCount: number;
  commercialCount: number;
  reliefMeters: number | null;
}) {
  let score = 16;
  score += Math.min(args.landmarkCount * 10, 28);
  score += Math.min(args.trailheadCount * 4, 18);
  score += Math.min(args.parkCount * 5, 16);
  score += Math.min(args.commercialCount * 2, 14);

  if (typeof args.reliefMeters === "number") {
    if (args.reliefMeters >= 450) score += 18;
    else if (args.reliefMeters >= 180) score += 10;
    else if (args.reliefMeters >= 60) score += 5;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

function classifyInterest(score: number) {
  if (score >= 75) return "Distinctive";
  if (score >= 45) return "Moderately notable";
  return "Low-key";
}

export async function analyzeGeneralExplore(
  geometryContext: LensGeometryContext,
  locationName: string,
): Promise<LensAnalysisComputation> {
  const searchRadiusKm = Math.max(geometryContext.sampleRadiusKm, 5);
  const [terrain, climateSnapshot, infrastructure, landmarks] = await Promise.all([
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
  ]);

  const elements = infrastructure.elements ?? [];
  const amenitySignals = buildAmenitySignals(elements);
  const nearestRoad = nearestMatchingFeature(
    geometryContext.centroid,
    elements,
    (element) => Boolean(element.tags?.highway),
    "Road access",
  );
  const nearestWater = nearestMatchingFeature(
    geometryContext.centroid,
    elements,
    (element) => Boolean(element.tags?.waterway || element.tags?.natural === "water"),
    "Water feature",
  );
  const interestScore = buildInterestScore({
    landmarkCount: landmarks.length,
    trailheadCount: amenitySignals.trailheadCount,
    parkCount: amenitySignals.parkCount,
    commercialCount: amenitySignals.commercialCount,
    reliefMeters: terrain.reliefMeters,
  });
  const placeCharacter = classifyInterest(interestScore);

  const fallbackNarrative = [
    `${locationName} reads as a ${placeCharacter.toLowerCase()} place overall, with ${landmarks.length} mapped landmark${landmarks.length === 1 ? "" : "s"} and ${amenitySignals.parkCount} park-oriented stop${amenitySignals.parkCount === 1 ? "" : "s"} in the local context.`,
    `Terrain relief is about ${formatElevationFeet(terrain.reliefMeters)}, and mapped water is ${formatDistanceKm(nearestWater.distanceKm)} from the center.`,
    `Direct road access is ${formatDistanceKm(nearestRoad.distanceKm)} away, while the broader local fabric shows ${amenitySignals.commercialCount} commercial signal${amenitySignals.commercialCount === 1 ? "" : "s"} and ${amenitySignals.trailheadCount} outdoor access cue${amenitySignals.trailheadCount === 1 ? "" : "s"}.`,
    climateSnapshot.climate.weatherRiskSummary
      ? `Short-range conditions suggest ${climateSnapshot.climate.weatherRiskSummary.toLowerCase()}.`
      : "No immediate weather warning surfaced in the short-range forecast context.",
  ].join(" ");

  return {
    title: `${locationName} general explore snapshot`,
    metrics: [
      buildMetricRow({
        id: "general-place-character",
        label: "Place character",
        value: `${placeCharacter} (${interestScore}/100)`,
        icon: "trail",
        detail: "Derived from landmarks, parks, trail access, commerce, and terrain relief.",
        estimated: true,
      }),
      buildMetricRow({
        id: "general-landmarks",
        label: "Landmarks and attractions",
        value: `${landmarks.length} mapped`,
        icon: "trail",
        detail:
          landmarks[0]?.name ?? "No named nearby attraction surfaced from OSM.",
        riskLevel:
          landmarks.length >= 4 ? "low" : landmarks.length >= 2 ? "moderate" : "high",
      }),
      buildMetricRow({
        id: "general-outdoor",
        label: "Outdoor context",
        value: `${amenitySignals.trailheadCount + amenitySignals.parkCount} outdoor cues`,
        icon: "mountain",
        detail: `${amenitySignals.trailheadCount} trail or viewpoint cues · ${amenitySignals.parkCount} park signals.`,
        estimated: true,
      }),
      buildMetricRow({
        id: "general-relief",
        label: "Terrain relief",
        value: formatElevationFeet(terrain.reliefMeters),
        icon: "mountain",
        detail: "Sampled from local elevation around the active place or AOI.",
      }),
      buildMetricRow({
        id: "general-access-water",
        label: "Access and water",
        value: `${formatDistanceKm(nearestRoad.distanceKm)} road · ${formatDistanceKm(nearestWater.distanceKm)} water`,
        icon: "water",
        detail: "Road and water proximity from OSM/Overpass features near the centroid.",
        riskLevel:
          nearestRoad.distanceKm !== null && nearestRoad.distanceKm > 5 ? "high" : "low",
      }),
      buildMetricRow({
        id: "general-weather",
        label: "Current conditions",
        value: climateSnapshot.climate.weatherRiskSummary ?? "No major weather flag",
        icon: "water",
        detail:
          climateSnapshot.climate.currentTempC !== null
            ? `${Math.round(climateSnapshot.climate.currentTempC)} C now · AQI ${climateSnapshot.climate.airQualityIndex ?? "?"}`
            : "Current temp and AQI snapshot unavailable.",
        riskLevel:
          climateSnapshot.climate.weatherRiskSummary
            ? "high"
            : toRiskLevel(climateSnapshot.climate.airQualityIndex, {
                low: 50,
                moderate: 100,
              }),
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
      interestScore,
      placeCharacter,
      landmarkCount: landmarks.length,
      amenitySignals,
      nearestRoad,
      nearestWater,
      terrain,
      climate: climateSnapshot.climate,
    },
    fallbackNarrative,
  };
}
