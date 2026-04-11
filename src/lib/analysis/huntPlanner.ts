import { toBoundingBox } from "@/lib/geospatial";
import { fetchFireHazardSummary } from "@/lib/nasa-firms";
import { fetchNearbyInfrastructure, fetchNearbyPlaces } from "@/lib/overpass";
import {
  LensAnalysisComputation,
  LensGeometryContext,
  buildMetricRow,
  formatDistanceKm,
  formatElevationFeet,
  formatPercent,
  nearestMatchingFeature,
  sampleTerrainSnapshot,
  toRiskLevel,
} from "@/lib/analysis/shared";

export async function analyzeHuntPlanner(
  geometryContext: LensGeometryContext,
  locationName: string,
): Promise<LensAnalysisComputation> {
  const searchRadiusKm = Math.max(geometryContext.sampleRadiusKm, 6);
  const [terrain, infrastructure, trailPlaces, fireSummary] = await Promise.all([
    sampleTerrainSnapshot(geometryContext.centroid, geometryContext.sampleRadiusKm),
    fetchNearbyInfrastructure(toBoundingBox(geometryContext.centroid, searchRadiusKm)).catch(() => ({
      elements: [],
    })),
    fetchNearbyPlaces(geometryContext.centroid, locationName, "trail").catch(() => []),
    fetchFireHazardSummary(geometryContext.centroid).catch(() => ({
      activeFireCount7d: null,
      nearestFireKm: null,
      maxBrightnessTempK: null,
      dataSource: null,
    })),
  ]);

  const elements = infrastructure.elements ?? [];
  const nearestWater = nearestMatchingFeature(
    geometryContext.centroid,
    elements,
    (element) => Boolean(element.tags?.waterway || element.tags?.natural === "water"),
    "Water source",
  );
  const nearestRoad = nearestMatchingFeature(
    geometryContext.centroid,
    elements,
    (element) => Boolean(element.tags?.highway),
    "Road access",
  );
  const nearestTrail = trailPlaces[0] ?? null;

  const fireValue =
    fireSummary.nearestFireKm !== null
      ? `${formatDistanceKm(fireSummary.nearestFireKm)} to nearest detection`
      : fireSummary.activeFireCount7d === 0
        ? "No active detections in the last 7 days"
        : "Fire data temporarily unavailable";

  const fallbackNarrative = [
    `The ${geometryContext.geometryLabel.toLowerCase()} around ${locationName} shows roughly ${formatElevationFeet(terrain.reliefMeters)} of local relief, with an estimated slope near ${formatPercent(terrain.estimatedSlopePercent)}.`,
    `Mapped water is ${formatDistanceKm(nearestWater.distanceKm)} away and the nearest road approach is ${formatDistanceKm(nearestRoad.distanceKm)}.`,
    nearestTrail
      ? `OpenStreetMap also shows trail access about ${formatDistanceKm(nearestTrail.distanceKm)} from the centroid, which can help with ingress but may mean more visible pressure.`
      : "No named trail access surfaced nearby, which may help privacy but could make entry slower.",
    fireSummary.nearestFireKm !== null || fireSummary.activeFireCount7d === 0
      ? `Recent fire context looks like ${fireValue.toLowerCase()}.`
      : "NASA FIRMS fire context is temporarily unavailable, so wildfire recency still needs a manual check.",
  ].join(" ");

  return {
    title: `${locationName} huntability snapshot`,
    metrics: [
      buildMetricRow({
        id: "terrain-relief",
        label: "Terrain relief",
        value: formatElevationFeet(terrain.reliefMeters),
        icon: "mountain",
        detail: "Sampled from USGS/OpenTopo elevation around the active AOI centroid.",
      }),
      buildMetricRow({
        id: "terrain-slope",
        label: "Estimated slope",
        value: formatPercent(terrain.estimatedSlopePercent),
        icon: "slope",
        detail: "Estimated from local elevation relief across the AOI footprint.",
        estimated: true,
        riskLevel: toRiskLevel(terrain.estimatedSlopePercent, { low: 8, moderate: 18 }),
      }),
      buildMetricRow({
        id: "nearest-water",
        label: "Nearest water",
        value: formatDistanceKm(nearestWater.distanceKm),
        icon: "water",
        detail: nearestWater.name,
        riskLevel: toRiskLevel(nearestWater.distanceKm, { low: 1.2, moderate: 3.5 }),
      }),
      buildMetricRow({
        id: "road-access",
        label: "Road access",
        value: formatDistanceKm(nearestRoad.distanceKm),
        icon: "road",
        detail: nearestRoad.name,
        riskLevel: toRiskLevel(nearestRoad.distanceKm, { low: 1.5, moderate: 5 }),
      }),
      buildMetricRow({
        id: "trail-access",
        label: "Trail proximity",
        value: nearestTrail ? formatDistanceKm(nearestTrail.distanceKm) : "No mapped trail nearby",
        icon: "trail",
        detail: nearestTrail?.name ?? "No named OSM trail or trailhead found in the local search window.",
        riskLevel: nearestTrail ? toRiskLevel(nearestTrail.distanceKm, { low: 1.2, moderate: 4 }) : undefined,
      }),
      buildMetricRow({
        id: "fire-context",
        label: "Active fire context",
        value: fireValue,
        icon: "fire",
        detail:
          fireSummary.activeFireCount7d !== null
            ? `${fireSummary.activeFireCount7d} detections in the last 7 days.`
            : "NASA FIRMS detections unavailable for this request.",
        riskLevel:
          fireSummary.nearestFireKm !== null
            ? toRiskLevel(fireSummary.nearestFireKm, { low: 20, moderate: 50, reverse: true })
            : undefined,
      }),
    ],
    attribution: [
      "USGS / OpenTopo elevation",
      "OpenStreetMap via Overpass",
      "NASA FIRMS active fire detections",
    ],
    promptContext: {
      locationName,
      geometryType: geometryContext.geometryLabel,
      terrain: terrain,
      nearestWater,
      nearestRoad,
      nearestTrail: nearestTrail
        ? {
            name: nearestTrail.name,
            distanceKm: nearestTrail.distanceKm,
          }
        : null,
      fireSummary,
    },
    fallbackNarrative,
  };
}
