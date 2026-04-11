import { toBoundingBox } from "@/lib/geospatial";
import { getFloodZone } from "@/lib/fema-flood";
import { fetchFireHazardSummary } from "@/lib/nasa-firms";
import { fetchClimateSnapshot } from "@/lib/open-meteo";
import { fetchNearbyInfrastructure } from "@/lib/overpass";
import {
  LensAnalysisComputation,
  LensGeometryContext,
  buildMetricRow,
  formatAreaFromAcres,
  formatDistanceKm,
  formatPercent,
  nearestMatchingFeature,
  sampleTerrainSnapshot,
  toRiskLevel,
} from "@/lib/analysis/shared";
import { AnalysisRiskLevel, Coordinates, FloodZoneResult } from "@/types";

function buildFloodSamplePoints(geometryContext: LensGeometryContext): Coordinates[] {
  const bbox = geometryContext.bbox;
  const samples = [
    geometryContext.centroid,
    { lat: bbox.north, lng: bbox.west },
    { lat: bbox.north, lng: bbox.east },
    { lat: bbox.south, lng: bbox.east },
    { lat: bbox.south, lng: bbox.west },
  ];

  if (geometryContext.feature?.geometry.type === "LineString") {
    const coordinates = geometryContext.feature.geometry.coordinates;
    const mid = coordinates[Math.floor(coordinates.length / 2)];
    return [
      { lat: coordinates[0][1], lng: coordinates[0][0] },
      mid ? { lat: mid[1], lng: mid[0] } : geometryContext.centroid,
      {
        lat: coordinates[coordinates.length - 1][1],
        lng: coordinates[coordinates.length - 1][0],
      },
    ];
  }

  if (geometryContext.feature?.geometry.type === "Point") {
    return [geometryContext.centroid];
  }

  return samples;
}

function summarizeFloodSamples(samples: Array<FloodZoneResult | null>) {
  const valid = samples.filter((value): value is FloodZoneResult => value !== null);
  if (!valid.length) {
    return {
      label: "Flood data temporarily unavailable",
      sampledHazardShare: null,
      riskLevel: undefined as AnalysisRiskLevel | undefined,
    };
  }

  const specialHazardCount = valid.filter((sample) => sample.isSpecialFloodHazard).length;
  const sampledHazardShare = specialHazardCount / valid.length;
  const dominantZone =
    valid
      .map((sample) => sample.label)
      .sort(
        (left, right) =>
          valid.filter((sample) => sample.label === right).length -
          valid.filter((sample) => sample.label === left).length,
      )[0] ?? valid[0].label;

  return {
    label:
      sampledHazardShare === 0
        ? `No sampled Special Flood Hazard Area overlap (${dominantZone})`
        : `${Math.round(sampledHazardShare * 100)}% of sampled points fall in Special Flood Hazard Area`,
    sampledHazardShare,
    riskLevel:
      (sampledHazardShare >= 0.4 ? "high" : sampledHazardShare > 0 ? "moderate" : "low") as AnalysisRiskLevel,
  };
}

function buildAccessScore(roadKm: number | null, powerKm: number | null) {
  const roadScore =
    roadKm === null ? 30 : Math.max(0, Math.min(100, Math.round(100 - roadKm * 14)));
  const powerScore =
    powerKm === null ? 25 : Math.max(0, Math.min(100, Math.round(100 - powerKm * 10)));

  return Math.round(roadScore * 0.6 + powerScore * 0.4);
}

function buildWildfireHeuristic({
  nearestFireKm,
  activeFireCount7d,
  windSpeedKph,
  slopePercent,
}: {
  nearestFireKm: number | null;
  activeFireCount7d: number | null;
  windSpeedKph: number | null;
  slopePercent: number | null;
}) {
  let score = 16;

  if (nearestFireKm !== null) {
    score += Math.max(0, 40 - nearestFireKm * 0.9);
  }
  if (activeFireCount7d !== null) {
    score += Math.min(activeFireCount7d * 2.5, 24);
  }
  if (windSpeedKph !== null) {
    score += Math.min(windSpeedKph * 0.65, 18);
  }
  if (slopePercent !== null) {
    score += Math.min(slopePercent * 1.2, 18);
  }

  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  return {
    score: clamped,
    label: clamped >= 70 ? "Elevated" : clamped >= 45 ? "Moderate" : "Lower",
    riskLevel: (clamped >= 70 ? "high" : clamped >= 45 ? "moderate" : "low") as AnalysisRiskLevel,
  };
}

export async function analyzeLandQuickCheck(
  geometryContext: LensGeometryContext,
  locationName: string,
): Promise<LensAnalysisComputation> {
  const [terrain, infrastructure, fireSummary, climateSnapshot, floodSamples] = await Promise.all([
    sampleTerrainSnapshot(geometryContext.centroid, geometryContext.sampleRadiusKm),
    fetchNearbyInfrastructure(
      toBoundingBox(geometryContext.centroid, Math.max(geometryContext.sampleRadiusKm, 6)),
    ).catch(() => ({ elements: [] })),
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
    Promise.all(buildFloodSamplePoints(geometryContext).map((point) => getFloodZone(point.lat, point.lng).catch(() => null))),
  ]);

  const elements = infrastructure.elements ?? [];
  const nearestRoad = nearestMatchingFeature(
    geometryContext.centroid,
    elements,
    (element) => Boolean(element.tags?.highway),
    "Road access",
  );
  const nearestPower = nearestMatchingFeature(
    geometryContext.centroid,
    elements,
    (element) => Boolean(element.tags?.power),
    "Power line",
  );
  const accessScore = buildAccessScore(nearestRoad.distanceKm, nearestPower.distanceKm);
  const floodSummary = summarizeFloodSamples(floodSamples);
  const wildfireHeuristic = buildWildfireHeuristic({
    nearestFireKm: fireSummary.nearestFireKm,
    activeFireCount7d: fireSummary.activeFireCount7d,
    windSpeedKph: climateSnapshot.climate.windSpeedKph,
    slopePercent: terrain.estimatedSlopePercent,
  });

  const fallbackNarrative = [
    `${locationName} reads as a ${geometryContext.areaAcres !== null ? formatAreaFromAcres(geometryContext.areaAcres).toLowerCase() : "site"} with an estimated slope near ${formatPercent(terrain.estimatedSlopePercent)}.`,
    `${floodSummary.label}.`,
    `Road access is ${formatDistanceKm(nearestRoad.distanceKm)} away and mapped power is ${formatDistanceKm(nearestPower.distanceKm)} away, which produces an estimated access score of ${accessScore}/100.`,
    `Wildfire context currently looks ${wildfireHeuristic.label.toLowerCase()} risk based on nearby FIRMS detections, wind, and terrain exposure.`,
  ].join(" ");

  return {
    title: `${locationName} land quick-check`,
    metrics: [
      buildMetricRow({
        id: "land-acreage",
        label: "Estimated acreage",
        value: formatAreaFromAcres(geometryContext.areaAcres),
        icon: "area",
        detail:
          geometryContext.areaAcres === null
            ? "Draw a polygon, rectangle, or circle to measure acreage."
            : `${geometryContext.geometryLabel} area measured from GeoJSON geometry.`,
      }),
      buildMetricRow({
        id: "land-slope",
        label: "Estimated slope",
        value: formatPercent(terrain.estimatedSlopePercent),
        icon: "slope",
        detail: "Calculated from sampled elevation relief across the AOI footprint.",
        estimated: true,
        riskLevel: toRiskLevel(terrain.estimatedSlopePercent, { low: 6, moderate: 15 }),
      }),
      buildMetricRow({
        id: "land-flood",
        label: "Flood overlap",
        value: floodSummary.label,
        icon: "flood",
        detail: "Sampled from FEMA NFHL in the US or GloFAS global fallback at multiple AOI points.",
        estimated: true,
        riskLevel: floodSummary.riskLevel,
      }),
      buildMetricRow({
        id: "land-access",
        label: "Road / utility access",
        value: `${accessScore}/100`,
        icon: "road",
        detail: `Road ${formatDistanceKm(nearestRoad.distanceKm)} · Power ${formatDistanceKm(nearestPower.distanceKm)}`,
        estimated: true,
        riskLevel: toRiskLevel(accessScore, { low: 45, moderate: 75, reverse: true }),
      }),
      buildMetricRow({
        id: "land-wildfire",
        label: "Wildfire risk",
        value: `${wildfireHeuristic.label} (${wildfireHeuristic.score}/100)`,
        icon: "fire",
        detail:
          fireSummary.nearestFireKm !== null
            ? `Nearest detection ${formatDistanceKm(fireSummary.nearestFireKm)} · Wind ${climateSnapshot.climate.windSpeedKph?.toFixed(0) ?? "?"} kph`
            : "FIRMS detections unavailable for this request.",
        estimated: true,
        riskLevel: wildfireHeuristic.riskLevel,
      }),
    ],
    attribution: [
      "FEMA NFHL / GloFAS flood context",
      "USGS / OpenTopo elevation",
      "OpenStreetMap via Overpass",
      "NASA FIRMS active fire detections",
      "Open-Meteo wind snapshot",
    ],
    promptContext: {
      locationName,
      geometryType: geometryContext.geometryLabel,
      acreage: geometryContext.areaAcres,
      estimatedSlopePercent: terrain.estimatedSlopePercent,
      floodSummary,
      accessScore,
      nearestRoad,
      nearestPower,
      wildfireHeuristic,
    },
    fallbackNarrative,
  };
}
