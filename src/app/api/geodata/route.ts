import { NextRequest, NextResponse } from "next/server";
import { fetchCountyDemographics } from "@/lib/census";
import { toBoundingBox } from "@/lib/geospatial";
import { calculateDistanceKm } from "@/lib/nearby-places";
import { fetchClimateSnapshot } from "@/lib/open-meteo";
import {
  buildAmenitySignals,
  fetchNearbyInfrastructure,
  getElementCoordinates,
  OverpassElement,
} from "@/lib/overpass";
import {
  applyRateLimit,
  createRateLimitResponse,
  getCoordinatesFromSearchParams,
  rateLimitHeaders,
} from "@/lib/request-guards";
import { fetchSchoolContext, summarizeSchoolContext } from "@/lib/schools";
import { buildSourceMeta } from "@/lib/source-metadata";
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
    .filter(
      (candidate): candidate is { element: OverpassElement; distanceKm: number } =>
        candidate !== null,
    )
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

    if (natural === "water" || tags.waterway || landuse === "reservoir" || landuse === "basin") {
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

  const [elevationResult, infrastructureResult, climateResult, demographicsResult, hazardResult, schoolResult] =
    await Promise.allSettled([
      fetchElevation({ lat, lng }),
      fetchNearbyInfrastructure(bbox),
      fetchClimateSnapshot({ lat, lng }),
      fetchCountyDemographics({ lat, lng }),
      fetchEarthquakeSummary({ lat, lng }),
      fetchSchoolContext({ lat, lng }),
    ]);

  const infrastructure =
    infrastructureResult.status === "fulfilled" ? infrastructureResult.value.elements ?? [] : [];
  const roads = infrastructure.filter((item) => item.tags?.highway);
  const power = infrastructure.filter((item) => item.tags?.power);
  const waterways = infrastructure.filter(
    (item) => item.tags?.waterway || item.tags?.natural === "water",
  );
  const amenitySignals = buildAmenitySignals(infrastructure);
  const now = new Date().toISOString();

  const geodata: GeodataResult = {
    elevationMeters: elevationResult.status === "fulfilled" ? elevationResult.value : null,
    nearestWaterBody: buildNearestFeature({ lat, lng }, waterways, "Nearby mapped waterway"),
    nearestRoad: buildNearestFeature({ lat, lng }, roads, "Road network"),
    nearestPower: buildNearestFeature({ lat, lng }, power, "Transmission infrastructure"),
    climate:
      climateResult.status === "fulfilled"
        ? climateResult.value
        : {
            currentTempC: null,
            averageTempC: null,
            dailyHighTempC: null,
            dailyLowTempC: null,
            coolingDegreeDays: null,
            precipitationMm: null,
            windSpeedKph: null,
            airQualityIndex: null,
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
    amenities:
      infrastructureResult.status === "fulfilled"
        ? amenitySignals
        : {
            schoolCount: null,
            healthcareCount: null,
            foodAndDrinkCount: null,
            transitStopCount: null,
            parkCount: null,
            trailheadCount: null,
            commercialCount: null,
          },
    schoolContext:
      schoolResult.status === "fulfilled"
        ? summarizeSchoolContext(schoolResult.value)
        : null,
    landClassification: buildLandCoverBuckets(infrastructure),
    sources: {
      elevation: buildSourceMeta({
        id: "elevation",
        label: "Elevation",
        provider: "USGS National Map EPQS",
        status:
          elevationResult.status === "fulfilled" && elevationResult.value !== null
            ? "live"
            : "unavailable",
        lastUpdated: now,
        freshness: "On-demand request",
        coverage: "Best for US locations",
        confidence:
          elevationResult.status === "fulfilled" && elevationResult.value !== null
            ? "Direct point elevation lookup."
            : "No elevation response was returned for this point.",
      }),
      infrastructure: buildSourceMeta({
        id: "infrastructure",
        label: "Infrastructure and access",
        provider: "OpenStreetMap via Overpass",
        status: infrastructureResult.status === "fulfilled" ? "live" : "limited",
        lastUpdated: now,
        freshness: "Cached up to 6 hours",
        coverage: "Global, map completeness varies by region",
        confidence:
          infrastructure.length > 0
            ? "Direct mapped roads, power, waterways, and land-use features."
            : "Coverage depends on OpenStreetMap completeness near the selected point.",
      }),
      climate: buildSourceMeta({
        id: "climate",
        label: "Weather and air quality",
        provider: "Open-Meteo",
        status:
          climateResult.status === "fulfilled" &&
          (climateResult.value.currentTempC !== null || climateResult.value.airQualityIndex !== null)
            ? climateResult.value.airQualityIndex === null
              ? "limited"
              : "live"
            : "unavailable",
        lastUpdated: now,
        freshness: "Cached up to 6 hours",
        coverage: "Global forecast coverage, AQI coverage varies",
        confidence:
          climateResult.status === "fulfilled"
            ? "Direct forecast and current-condition snapshot from Open-Meteo."
            : "Weather or AQI data could not be retrieved for this point.",
      }),
      hazards: buildSourceMeta({
        id: "hazards",
        label: "Hazard context",
        provider: "USGS Earthquake Catalog",
        status: hazardResult.status === "fulfilled" ? "live" : "limited",
        lastUpdated: now,
        freshness: "Cached up to 6 hours",
        coverage: "Global earthquakes, current implementation summarizes recent seismic context",
        confidence:
          hazardResult.status === "fulfilled"
            ? "Recent seismic activity is direct; this is not a full hazard-risk model."
            : "No recent seismic context was returned for this point.",
      }),
      demographics: buildSourceMeta({
        id: "demographics",
        label: "Demographics",
        provider: "FCC + US Census ACS 5-year",
        status:
          demographicsResult.status === "fulfilled" &&
          demographicsResult.value.population !== null
            ? "live"
            : demographicsResult.status === "fulfilled"
              ? "limited"
              : "unavailable",
        lastUpdated: now,
        freshness: "ACS 5-year estimates, cached 24 hours",
        coverage: "US counties only",
        confidence:
          demographicsResult.status === "fulfilled"
            ? "County-level demographics, not parcel- or neighborhood-level."
            : "Demographic coverage is unavailable outside the current US pipeline.",
      }),
      amenities: buildSourceMeta({
        id: "amenities",
        label: "Amenities and activity",
        provider: "OpenStreetMap via Overpass",
        status: infrastructureResult.status === "fulfilled" ? "live" : "limited",
        lastUpdated: now,
        freshness: "Cached up to 6 hours",
        coverage: "Global, depends on local OpenStreetMap completeness",
        confidence:
          infrastructureResult.status === "fulfilled"
            ? "Counts are based on mapped schools, healthcare, transit, parks, trailheads, and commercial POIs within the active analysis box."
            : "Amenity counts could not be derived from the current Overpass response.",
      }),
      school:
        schoolResult.status === "fulfilled"
          ? buildSourceMeta({
              id: "school",
              label: "School context",
              provider:
                schoolResult.value.coverageStatus === "state_accountability_supported"
                  ? "NCES + Washington OSPI + GeoSight"
                  : "NCES + GeoSight",
              status:
                schoolResult.value.score === null
                  ? schoolResult.value.coverageStatus === "outside_us"
                    ? "unavailable"
                    : "limited"
                  : schoolResult.value.coverageStatus === "state_accountability_supported"
                    ? "live"
                    : "derived",
              lastUpdated:
                schoolResult.value.sources.stateAccountability.lastUpdated ??
                schoolResult.value.sources.baseline.lastUpdated ??
                now,
              freshness:
                schoolResult.value.coverageStatus === "state_accountability_supported"
                  ? "Mixed live baseline + 2023-24 Washington accountability"
                  : "2024-25 NCES baseline plus GeoSight normalization",
              coverage:
                schoolResult.value.coverageStatus === "outside_us"
                  ? "US public K-12 only"
                  : schoolResult.value.coverageStatus === "state_accountability_supported"
                    ? "US baseline with Washington official accountability"
                    : "US public K-12 only; Washington official data when available",
              confidence: schoolResult.value.explanation,
            })
          : buildSourceMeta({
              id: "school",
              label: "School context",
              provider: "NCES + GeoSight",
              status: "limited",
              lastUpdated: now,
              freshness: "On-demand request",
              coverage: "US public K-12 only",
              confidence: "School context could not be assembled for this point.",
            }),
      landClassification: buildSourceMeta({
        id: "land-classification",
        label: "Land cover estimate",
        provider: "Derived from OpenStreetMap land-use and natural features",
        status: infrastructure.length > 0 ? "derived" : "limited",
        lastUpdated: now,
        freshness: "Derived from the current Overpass fetch",
        coverage: "Global where OSM land-use tagging exists",
        confidence:
          infrastructure.length > 0
            ? "Approximate land-cover mix inferred from mapped land-use and natural tags."
            : "No mapped land-use context was available to derive land-cover buckets.",
      }),
    },
    sourceNotes: [
      "USGS elevation via The National Map EPQS.",
      "Overpass OSM features for roads, power lines, waterways, amenities, and land-use context.",
      "Open-Meteo current weather, forecast, and air-quality snapshots.",
      "USGS earthquake event feed summarized within 250 km over the last 30 days.",
      "FCC county lookup with ACS 5-year Census demographics.",
      "NCES nearby public-school baseline with Washington OSPI official accountability when matched.",
    ],
  };

  return NextResponse.json(geodata, {
    headers: {
      "Cache-Control": "s-maxage=21600, stale-while-revalidate=43200",
      ...rateLimitHeaders(rateLimit),
    },
  });
}
