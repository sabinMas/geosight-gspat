import { NextRequest, NextResponse } from "next/server";
import { fetchCountyDemographics } from "@/lib/census";
import { toBoundingBox } from "@/lib/geospatial";
import { calculateDistanceKm } from "@/lib/nearby-places";
import { fetchClimateSnapshot } from "@/lib/open-meteo";
import { fetchNearbyInfrastructure, getElementCoordinates, OverpassElement } from "@/lib/overpass";
import {
  applyRateLimit,
  createRateLimitResponse,
  getCoordinatesFromSearchParams,
  rateLimitHeaders,
} from "@/lib/request-guards";
import { fetchEarthquakeSummary } from "@/lib/usgs-earthquakes";
import { fetchElevation } from "@/lib/usgs";
import { GeodataResult } from "@/types";

function buildNearestFeature(
  center: { lat: number; lng: number },
  elements: OverpassElement[],
  fallbackName: string,
) {
  const nearest = elements
    .map((element) => {
      const coordinates = getElementCoordinates(element);
      if (!coordinates) {
        return null;
      }

      return {
        element,
        distanceKm: Number(calculateDistanceKm(center, coordinates).toFixed(1)),
      };
    })
    .filter((candidate): candidate is { element: OverpassElement; distanceKm: number } => candidate !== null)
    .sort((a, b) => a.distanceKm - b.distanceKm)[0];

  return {
    name:
      nearest?.element.tags?.name ??
      nearest?.element.tags?.ref ??
      nearest?.element.tags?.highway ??
      nearest?.element.tags?.power ??
      fallbackName,
    distanceKm: nearest?.distanceKm ?? null,
  };
}

function buildLandCoverBuckets(elements: OverpassElement[]): GeodataResult["landClassification"] {
  const counts = {
    vegetation: 0,
    water: 0,
    urban: 0,
    barrenIndustrial: 0,
  };

  for (const element of elements) {
    const tags = element.tags ?? {};
    const natural = tags.natural ?? "";
    const landuse = tags.landuse ?? "";
    const leisure = tags.leisure ?? "";

    if (
      natural === "water" ||
      tags.waterway ||
      landuse === "reservoir" ||
      landuse === "basin"
    ) {
      counts.water += 1;
      continue;
    }

    if (
      natural === "wood" ||
      natural === "scrub" ||
      natural === "wetland" ||
      natural === "grassland" ||
      natural === "heath" ||
      landuse === "forest" ||
      landuse === "meadow" ||
      landuse === "farmland" ||
      landuse === "orchard" ||
      landuse === "vineyard" ||
      leisure === "park"
    ) {
      counts.vegetation += 1;
      continue;
    }

    if (
      landuse === "residential" ||
      landuse === "commercial" ||
      landuse === "retail" ||
      landuse === "education" ||
      landuse === "railway"
    ) {
      counts.urban += 1;
      continue;
    }

    if (
      landuse === "industrial" ||
      landuse === "quarry" ||
      landuse === "construction" ||
      landuse === "brownfield" ||
      natural === "bare_rock" ||
      natural === "beach" ||
      natural === "sand"
    ) {
      counts.barrenIndustrial += 1;
    }
  }

  const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
  if (!total) {
    return [];
  }

  return [
    { label: "Vegetation", count: counts.vegetation, color: "#5be49b" },
    { label: "Water", count: counts.water, color: "#00e5ff" },
    { label: "Urban", count: counts.urban, color: "#a8b8c8" },
    { label: "Barren/Industrial", count: counts.barrenIndustrial, color: "#ffab00" },
  ]
    .filter((bucket) => bucket.count > 0)
    .map((bucket) => ({
      label: bucket.label,
      value: Math.round((bucket.count / total) * 100),
      confidence: Number(Math.min(0.92, 0.45 + bucket.count / total).toFixed(2)),
      color: bucket.color,
    }))
    .sort((a, b) => b.value - a.value);
}

export async function GET(request: NextRequest) {
  const rateLimit = applyRateLimit(request, "geodata", {
    windowMs: 60_000,
    maxRequests: 24,
  });
  if (!rateLimit.allowed) {
    return createRateLimitResponse(rateLimit);
  }

  const coordinates = getCoordinatesFromSearchParams(request.nextUrl.searchParams);
  if (!coordinates) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  const { lat, lng } = coordinates;

  const bbox = toBoundingBox({ lat, lng }, 8);

  const [elevationResult, infrastructureResult, climateResult, demographicsResult, hazardResult] =
    await Promise.allSettled([
      fetchElevation({ lat, lng }),
      fetchNearbyInfrastructure(bbox),
      fetchClimateSnapshot({ lat, lng }),
      fetchCountyDemographics({ lat, lng }),
      fetchEarthquakeSummary({ lat, lng }),
    ]);

  const infrastructure =
    infrastructureResult.status === "fulfilled" ? infrastructureResult.value.elements ?? [] : [];
  const roads = infrastructure.filter((item) => item.tags?.highway);
  const power = infrastructure.filter((item) => item.tags?.power);
  const waterways = infrastructure.filter(
    (item) => item.tags?.waterway || item.tags?.natural === "water",
  );

  const geodata: GeodataResult = {
    elevationMeters: elevationResult.status === "fulfilled" ? elevationResult.value : null,
    nearestWaterBody: buildNearestFeature({ lat, lng }, waterways, "Nearby mapped waterway"),
    nearestRoad: buildNearestFeature({ lat, lng }, roads, "Road network"),
    nearestPower: buildNearestFeature({ lat, lng }, power, "Transmission infrastructure"),
    climate: {
      currentTempC:
        climateResult.status === "fulfilled" ? climateResult.value.currentTempC : null,
      averageTempC:
        climateResult.status === "fulfilled" ? climateResult.value.averageTempC : null,
      dailyHighTempC:
        climateResult.status === "fulfilled" ? climateResult.value.dailyHighTempC : null,
      dailyLowTempC:
        climateResult.status === "fulfilled" ? climateResult.value.dailyLowTempC : null,
      coolingDegreeDays:
        climateResult.status === "fulfilled" ? climateResult.value.coolingDegreeDays : null,
      precipitationMm:
        climateResult.status === "fulfilled" ? climateResult.value.precipitationMm : null,
      windSpeedKph:
        climateResult.status === "fulfilled" ? climateResult.value.windSpeedKph : null,
      airQualityIndex:
        climateResult.status === "fulfilled" ? climateResult.value.airQualityIndex : null,
    },
    hazards:
      hazardResult.status === "fulfilled"
        ? hazardResult.value
        : {
            earthquakeCount30d: null,
            strongestEarthquakeMagnitude30d: null,
            nearestEarthquakeKm: null,
          },
    demographics:
      demographicsResult.status === "fulfilled"
        ? demographicsResult.value
        : {
            countyName: null,
            stateCode: null,
            population: null,
            medianHouseholdIncome: null,
            medianHomeValue: null,
          },
    landClassification: buildLandCoverBuckets(infrastructure),
    sourceNotes: [
      "USGS elevation via The National Map EPQS.",
      "Overpass OSM features for roads, power lines, waterways, and land-use context.",
      "Open-Meteo current weather, forecast, and air-quality snapshots.",
      "USGS earthquake event feed summarized within 250 km over the last 30 days.",
      "FCC county lookup with ACS 5-year Census demographics.",
    ],
  };

  return NextResponse.json(geodata, {
    headers: {
      "Cache-Control": "s-maxage=21600, stale-while-revalidate=43200",
      ...rateLimitHeaders(rateLimit),
    },
  });
}
