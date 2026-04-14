import { NextRequest, NextResponse } from "next/server";
import { getGeodataCache, setGeodataCache } from "@/lib/user-storage";
import { getClimateHistory } from "@/lib/climate-history";
import { getNearbyGroundwaterWells } from "@/lib/groundwater";
import { getAirQuality } from "@/lib/air-quality";
import { fetchCountyDemographics } from "@/lib/census";
import { getEPAHazards } from "@/lib/epa-envirofacts";
import { getEEAIndustrialFacilities } from "@/lib/eea-industrial";
import { fetchEurostatBroadbandBaseline } from "@/lib/eurostat";
import { getFloodZone } from "@/lib/fema-flood";
import { getFCCBroadband } from "@/lib/fcc-broadband";
import { toBoundingBox } from "@/lib/geospatial";
import { calculateDistanceKm } from "@/lib/nearby-places";
import { fetchClimateSnapshot } from "@/lib/open-meteo";
import {
  buildAmenitySignals,
  fetchNearbyInfrastructure,
  getElementCoordinates,
  OverpassElement,
} from "@/lib/overpass";
import { fetchGdacsAlertSummary } from "@/lib/gdacs";
import { fetchFireHazardSummary, isFireHazardConfigured } from "@/lib/nasa-firms";
import {
  applyRateLimit,
  createRateLimitResponse,
  getCoordinatesFromSearchParams,
  rateLimitHeaders,
} from "@/lib/request-guards";
import { fetchSchoolContext, summarizeSchoolContext } from "@/lib/schools";
import { getSeismicDesignParams } from "@/lib/seismic-design";
import { getSoilProfile } from "@/lib/soil-profile";
import { resolveSourceRegistryContext } from "@/lib/source-registry";
import { buildRegistryAwareSourceMeta } from "@/lib/source-metadata";
import { sanitizeStreamGauges } from "@/lib/stream-gauges";
import { fetchEarthquakeSummary } from "@/lib/usgs-earthquakes";
import { fetchElevation } from "@/lib/usgs";
import { getNearbyStreamGauges } from "@/lib/water";
import { getSolarResource } from "@/lib/solar-resource";
import { GeodataResult } from "@/types";

const OPTIONAL_PROVIDER_TIMEOUTS = {
  fire: 6_500,
  schools: 7_000,
  broadband: 6_500,
  flood: 12_000,
  water: 7_000,
  groundwater: 7_500,
  soil: 14_000,
  seismic: 7_000,
  climateHistory: 8_500,
  airQuality: 7_000,
  epaHazards: 7_000,
  gdacsAlerts: 8_500,
  solar: 10_000,
} as const;

function withSoftTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      timeoutHandle = setTimeout(() => {
        reject(new Error(`[geodata] ${label} timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    }),
  ]).finally(() => {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  });
}

function isLikelyCountryCode(value: string | null) {
  return typeof value === "string" && /^[A-Z]{2}$/.test(value) && value !== "WA";
}

function isLikelyUsCoordinate(lat: number, lng: number) {
  return lat >= 18 && lat <= 72 && lng >= -180 && lng <= -64;
}

function isLikelyEuropeanCoordinate(lat: number, lng: number) {
  return lat >= 34 && lat <= 72 && lng >= -25 && lng <= 45;
}

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
  const rateLimit = await applyRateLimit(request, "geodata", {
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

  // Check Redis cache first
  const cached = await getGeodataCache(lat, lng);
  if (cached) {
    return NextResponse.json(cached, {
      headers: {
        ...rateLimitHeaders(rateLimit),
        "X-Cache": "HIT",
      },
    });
  }

  const bbox = toBoundingBox({ lat, lng }, 8);
  const isUsPoint = isLikelyUsCoordinate(lat, lng);
  const fireHazardConfigured = isFireHazardConfigured();
  const broadbandPromise = isUsPoint
    ? withSoftTimeout(
        getFCCBroadband(lat, lng),
        OPTIONAL_PROVIDER_TIMEOUTS.broadband,
        "broadband",
      )
    : Promise.resolve(null);
  const floodZonePromise = withSoftTimeout(
    getFloodZone(lat, lng),
    OPTIONAL_PROVIDER_TIMEOUTS.flood,
    "flood zone",
  );
  const waterGaugePromise = isUsPoint
    ? withSoftTimeout(
        getNearbyStreamGauges(lat, lng),
        OPTIONAL_PROVIDER_TIMEOUTS.water,
        "stream gauges",
      )
    : Promise.resolve([]);
  const groundwaterPromise = isUsPoint
    ? withSoftTimeout(
        getNearbyGroundwaterWells({ lat, lng }),
        OPTIONAL_PROVIDER_TIMEOUTS.groundwater,
        "groundwater",
      )
    : Promise.resolve({ wells: [], nearestWell: null, wellCount: 0 });
  const soilProfilePromise = withSoftTimeout(
    getSoilProfile({ lat, lng }),
    OPTIONAL_PROVIDER_TIMEOUTS.soil,
    "soil profile",
  );
  const seismicDesignPromise = isUsPoint
    ? withSoftTimeout(
        getSeismicDesignParams({ lat, lng }),
        OPTIONAL_PROVIDER_TIMEOUTS.seismic,
        "seismic design",
      )
    : Promise.resolve(null);
  const isEuropeanPoint = !isUsPoint && isLikelyEuropeanCoordinate(lat, lng);
  const epaHazardPromise = isUsPoint
    ? withSoftTimeout(
        getEPAHazards(lat, lng),
        OPTIONAL_PROVIDER_TIMEOUTS.epaHazards,
        "epa hazards",
      )
    : isEuropeanPoint
      ? withSoftTimeout(
          getEEAIndustrialFacilities(lat, lng),
          OPTIONAL_PROVIDER_TIMEOUTS.epaHazards,
          "eea industrial facilities",
        )
      : Promise.resolve(null);
  const gdacsAlertPromise = withSoftTimeout(
    fetchGdacsAlertSummary({ lat, lng }),
    OPTIONAL_PROVIDER_TIMEOUTS.gdacsAlerts,
    "gdacs alerts",
  );

  const [
    elevationResult,
    infrastructureResult,
    climateResult,
    demographicsResult,
    hazardResult,
    fireHazardResult,
    schoolResult,
    broadbandResult,
    floodZoneResult,
    waterGaugeResult,
    groundwaterResult,
    soilProfileResult,
    seismicDesignResult,
    climateHistoryResult,
    airQualityResult,
    epaHazardResult,
    gdacsAlertResult,
    solarResourceResult,
  ] =
    await Promise.allSettled([
      fetchElevation({ lat, lng }),
      withSoftTimeout(fetchNearbyInfrastructure(bbox), 20_000, "infrastructure"),
      fetchClimateSnapshot({ lat, lng }),
      fetchCountyDemographics({ lat, lng }),
      fetchEarthquakeSummary({ lat, lng }),
      withSoftTimeout(
        fetchFireHazardSummary({ lat, lng }),
        OPTIONAL_PROVIDER_TIMEOUTS.fire,
        "fire hazard",
      ),
      withSoftTimeout(fetchSchoolContext({ lat, lng }), OPTIONAL_PROVIDER_TIMEOUTS.schools, "schools"),
      broadbandPromise,
      floodZonePromise,
      waterGaugePromise,
      groundwaterPromise,
      soilProfilePromise,
      seismicDesignPromise,
      withSoftTimeout(
        getClimateHistory({ lat, lng }),
        OPTIONAL_PROVIDER_TIMEOUTS.climateHistory,
        "climate history",
      ),
      withSoftTimeout(getAirQuality(lat, lng), OPTIONAL_PROVIDER_TIMEOUTS.airQuality, "air quality"),
      epaHazardPromise,
      gdacsAlertPromise,
      withSoftTimeout(getSolarResource({ lat, lng }), OPTIONAL_PROVIDER_TIMEOUTS.solar, "solar resource"),
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
  const derivedLocationCode =
    (demographicsResult.status === "fulfilled" ? demographicsResult.value.stateCode : null) ??
    (schoolResult.status === "fulfilled" &&
    schoolResult.value.coverageStatus === "state_accountability_supported"
      ? "WA"
      : null);
  const registryContext = resolveSourceRegistryContext({
    countryCode: isLikelyCountryCode(derivedLocationCode) ? derivedLocationCode : null,
    stateCode: derivedLocationCode === "WA" ? derivedLocationCode : null,
  });
  const soilProfile =
    soilProfileResult.status === "fulfilled" ? soilProfileResult.value : null;
  const seismicDesign =
    seismicDesignResult.status === "fulfilled" ? seismicDesignResult.value : null;
  const effectiveDemographics =
    demographicsResult.status === "fulfilled"
      ? demographicsResult.value
      : {
          countyName: null,
          stateCode: null,
          population: null,
          medianHouseholdIncome: null,
          medianHomeValue: null,
          geographicGranularity: "country" as const,
          populationReferenceYear: null,
          incomeReferenceYear: null,
          incomeDefinition: null,
        };
  const climateHistory =
    climateHistoryResult.status === "fulfilled" ? climateHistoryResult.value : null;
  const eurostatBroadband =
    !isUsPoint &&
    registryContext.countryCode &&
    registryContext.scopes.includes("europe")
      ? await withSoftTimeout(
          fetchEurostatBroadbandBaseline(
            registryContext.countryCode,
            effectiveDemographics.countyName ?? registryContext.countryCode,
          ),
          OPTIONAL_PROVIDER_TIMEOUTS.broadband,
          "eurostat broadband",
        ).catch(() => null)
      : null;
  const broadbandData =
    isUsPoint && broadbandResult.status === "fulfilled"
      ? broadbandResult.value
      : eurostatBroadband;
  const streamGauges =
    isUsPoint && waterGaugeResult.status === "fulfilled"
      ? sanitizeStreamGauges(waterGaugeResult.value)
      : [];
  const hasSoilProfile =
    soilProfile !== null && Object.values(soilProfile).some((value) => value !== null);
  const hasSeismicDesign =
    seismicDesign !== null &&
    [seismicDesign.ss, seismicDesign.s1, seismicDesign.pga].some((value) => value !== null);
  const hasClimateHistory = climateHistory !== null && climateHistory.summaries.length > 0;

  const geodata: GeodataResult = {
    elevationMeters: elevationResult.status === "fulfilled" ? elevationResult.value : null,
    nearestWaterBody: buildNearestFeature({ lat, lng }, waterways, "Nearby mapped waterway"),
    nearestRoad: buildNearestFeature({ lat, lng }, roads, "Road network"),
    nearestPower: buildNearestFeature({ lat, lng }, power, "Transmission infrastructure"),
    climate:
      climateResult.status === "fulfilled"
        ? climateResult.value.climate
        : {
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
    weatherForecast:
      climateResult.status === "fulfilled" ? climateResult.value.forecast : [],
    hazards:
      hazardResult.status === "fulfilled"
        ? {
            ...hazardResult.value,
            activeFireCount7d:
              fireHazardResult.status === "fulfilled"
                ? fireHazardResult.value.activeFireCount7d
                : null,
            nearestFireKm:
              fireHazardResult.status === "fulfilled"
                ? fireHazardResult.value.nearestFireKm
                : null,
          }
        : {
            earthquakeCount30d: null,
            strongestEarthquakeMagnitude30d: null,
            nearestEarthquakeKm: null,
            activeFireCount7d:
              fireHazardResult.status === "fulfilled"
                ? fireHazardResult.value.activeFireCount7d
                : null,
            nearestFireKm:
              fireHazardResult.status === "fulfilled"
                ? fireHazardResult.value.nearestFireKm
                : null,
          },
    demographics: effectiveDemographics,
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
    broadband: broadbandData,
    floodZone: floodZoneResult.status === "fulfilled" ? floodZoneResult.value : null,
    streamGauges,
    groundwater:
      groundwaterResult.status === "fulfilled"
        ? groundwaterResult.value
        : { wells: [], nearestWell: null, wellCount: 0 },
    soilProfile,
    seismicDesign,
    climateHistory,
    solarResource: solarResourceResult.status === "fulfilled" ? solarResourceResult.value : null,
    airQuality: airQualityResult.status === "fulfilled" ? airQualityResult.value : null,
    epaHazards: epaHazardResult.status === "fulfilled" ? epaHazardResult.value : null,
    hazardAlerts: gdacsAlertResult.status === "fulfilled" ? gdacsAlertResult.value : null,
    schoolContext: (() => {
      const raw =
        schoolResult.status === "fulfilled"
          ? summarizeSchoolContext(schoolResult.value)
          : null;
      // For non-US locations, patch in OSM school count as a density proxy
      if (raw?.coverageStatus === "outside_us" && amenitySignals.schoolCount) {
        return { ...raw, nearbySchoolCount: amenitySignals.schoolCount };
      }
      return raw;
    })(),
    landClassification: buildLandCoverBuckets(infrastructure),
    sources: {
      elevation: buildRegistryAwareSourceMeta({
        id: "elevation",
        label: "Elevation",
        provider: isLikelyUsCoordinate(lat, lng) ? "USGS National Map EPQS" : "OpenTopoData SRTM",
        domain: "terrain",
        context: registryContext,
        status:
          elevationResult.status === "fulfilled" && elevationResult.value !== null
            ? "live"
            : "unavailable",
        lastUpdated: now,
        freshness: "On-demand request",
        coverage: "US high-res via USGS EPQS; global fallback via OpenTopoData SRTM",
        confidence:
          elevationResult.status === "fulfilled" && elevationResult.value !== null
            ? isLikelyUsCoordinate(lat, lng)
              ? "Direct point elevation lookup with region-aware fallback."
              : "Direct point elevation lookup from the global SRTM fallback."
            : "No elevation response was returned for this point.",
      }),
      infrastructure: buildRegistryAwareSourceMeta({
        id: "infrastructure",
        label: "Infrastructure and access",
        provider: "OpenStreetMap via Overpass",
        domain: "nearby_places",
        context: registryContext,
        status: infrastructureResult.status === "fulfilled" ? "live" : "limited",
        lastUpdated: now,
        freshness: "Cached up to 6 hours",
        coverage: "Global, map completeness varies by region",
        confidence:
          infrastructure.length > 0
            ? "Direct mapped roads, power, waterways, and land-use features."
            : "Coverage depends on OpenStreetMap completeness near the selected point.",
      }),
      climate: buildRegistryAwareSourceMeta({
        id: "climate",
        label: "Weather and air quality",
        provider: "Open-Meteo",
        domain: "weather",
        context: registryContext,
        status:
          climateResult.status === "fulfilled" &&
          (climateResult.value.climate.currentTempC !== null || climateResult.value.climate.airQualityIndex !== null)
            ? climateResult.value.climate.airQualityIndex === null
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
      hazards: buildRegistryAwareSourceMeta({
        id: "hazards",
        label: "Hazard context",
        provider: "USGS Earthquake Catalog",
        domain: "hazards",
        context: registryContext,
        status: hazardResult.status === "fulfilled" ? "live" : "limited",
        lastUpdated: now,
        freshness: "Cached up to 6 hours",
        coverage: "Global earthquakes plus first-pass fire and weather hazard context",
        confidence:
          hazardResult.status === "fulfilled"
            ? "Recent seismic activity is direct; fire detections and weather risk are first-pass signals, not a full hazard-risk model."
            : "No recent seismic context was returned for this point.",
      }),
      hazardFire: buildRegistryAwareSourceMeta({
        id: "hazard-fire",
        label: "Active fire detections",
        provider: "NASA FIRMS VIIRS SNPP",
        domain: "hazards",
        context: registryContext,
        status:
          !fireHazardConfigured
            ? "unavailable"
            : fireHazardResult.status === "fulfilled" &&
                fireHazardResult.value.activeFireCount7d !== null
              ? "live"
              : "limited",
        lastUpdated: now,
        freshness: "Cached up to 3 hours",
        coverage: "Global VIIRS satellite detections",
        accessType: "api",
        confidence:
          !fireHazardConfigured
            ? "NASA FIRMS needs an API map key before GeoSight can retrieve live fire detections."
            : fireHazardResult.status === "fulfilled" &&
                fireHazardResult.value.activeFireCount7d !== null
              ? "Near-real-time satellite detections within the active area."
              : "Fire detections could not be retrieved for this point.",
        note: !fireHazardConfigured
          ? "Set NASA_FIRMS_MAP_KEY to enable live global fire detections in the hazard stack."
          : undefined,
      }),
      demographics: buildRegistryAwareSourceMeta({
        id: "demographics",
        label: "Demographics",
        provider:
          registryContext.countryCode &&
          registryContext.countryCode !== "US" &&
          registryContext.scopes.includes("europe")
            ? "Eurostat"
            : registryContext.countryCode && registryContext.countryCode !== "US"
              ? "World Bank Open Data"
          : "FCC + US Census ACS 5-year",
        domain: "demographics",
        context: registryContext,
        status:
          demographicsResult.status === "fulfilled" &&
          demographicsResult.value.population !== null
            ? "live"
            : demographicsResult.status === "fulfilled"
              ? "limited"
              : "unavailable",
        lastUpdated: now,
        freshness:
          effectiveDemographics.geographicGranularity === "country" &&
          registryContext.scopes.includes("europe")
            ? "Official Eurostat annual/statistical releases"
            : "ACS 5-year estimates, cached 24 hours",
        coverage:
          registryContext.scopes.includes("europe")
            ? "US county-level via FCC + ACS; Europe country-level via Eurostat; World Bank fallback elsewhere"
            : "US county-level via FCC + ACS; national indicators via World Bank for non-US",
        confidence:
          demographicsResult.status === "fulfilled"
            ? effectiveDemographics.geographicGranularity === "country" &&
              registryContext.scopes.includes("europe")
              ? "European locations use Eurostat country-level population and median equivalised net income. This is official national context, not parcel or city-level demographics."
              : effectiveDemographics.geographicGranularity === "country"
                ? "Non-US locations use national-level fallback indicators rather than parcel or city-level demographics."
                : "US locations use county-level demographics from FCC + ACS."
            : "Demographic coverage is unavailable for this point.",
      }),
      amenities: buildRegistryAwareSourceMeta({
        id: "amenities",
        label: "Amenities and activity",
        provider: "OpenStreetMap via Overpass",
        domain: "nearby_places",
        context: registryContext,
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
          ? buildRegistryAwareSourceMeta({
              id: "school",
              label: "School context",
              provider:
                schoolResult.value.coverageStatus === "state_accountability_supported"
                  ? "NCES + Washington OSPI + GeoSight"
                  : "NCES + GeoSight",
              domain: "schools",
              context: registryContext,
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
          : buildRegistryAwareSourceMeta({
              id: "school",
              label: "School context",
              provider: "NCES + GeoSight",
              domain: "schools",
              context: registryContext,
              status: "limited",
              lastUpdated: now,
              freshness: "On-demand request",
              coverage: "US public K-12 only",
              confidence: "School context could not be assembled for this point.",
            }),
      landClassification: buildRegistryAwareSourceMeta({
        id: "land-classification",
        label: "Land cover estimate",
        provider: "Derived from OpenStreetMap land-use and natural features",
        domain: "imagery",
        context: registryContext,
        status: infrastructure.length > 0 ? "derived" : "limited",
        accessType: "derived",
        lastUpdated: now,
        freshness: "Derived from the current Overpass fetch",
        coverage: "Global where OSM land-use tagging exists",
        confidence:
          infrastructure.length > 0
            ? "Approximate land-cover mix inferred from mapped land-use and natural tags."
            : "No mapped land-use context was available to derive land-cover buckets.",
      }),
      broadband: buildRegistryAwareSourceMeta({
        id: "broadband",
        label: "Broadband availability",
        provider:
          broadbandData?.kind === "regional_household_baseline"
            ? "Eurostat"
            : "FCC Broadband Map",
        domain: "broadband",
        context: registryContext,
        status:
          broadbandData
            ? "live"
            : !isUsPoint && registryContext.scopes.includes("europe")
              ? "limited"
              : !isUsPoint
                ? "unavailable"
                : "limited",
        lastUpdated: now,
        freshness:
          broadbandData?.kind === "regional_household_baseline"
            ? "Official annual Eurostat household survey releases"
            : "Cached up to 24 hours",
        coverage:
          broadbandData?.kind === "regional_household_baseline"
            ? "Europe country-level household broadband baseline"
            : "United States address-level availability",
        confidence:
          broadbandData?.kind === "regional_household_baseline"
            ? "Eurostat provides country-level household fixed and mobile broadband percentages. This is a regional baseline, not a point-specific service lookup."
            : !isUsPoint
              ? "Point-specific broadband availability is not yet supported for this region."
              : broadbandResult.status === "fulfilled" && broadbandResult.value
                ? "Direct provider availability summary from the FCC Broadband Map."
                : "Broadband availability could not be confirmed for this point from the FCC public endpoint.",
        note:
          broadbandData?.kind === "regional_household_baseline"
            ? `${broadbandData.regionLabel} uses Eurostat household broadband percentages from ${broadbandData.referenceYear ?? "the latest available year"}, so treat this as national connectivity context rather than exact service at the selected point.`
            : undefined,
      }),
      floodZone: buildRegistryAwareSourceMeta({
        id: "flood-zone",
        label: "Flood zone",
        provider:
          floodZoneResult.status === "fulfilled" && floodZoneResult.value?.source === "glofas"
            ? "GloFAS via Open-Meteo"
            : "FEMA NFHL",
        domain: "hazards",
        context: registryContext,
        status: floodZoneResult.status === "fulfilled" && floodZoneResult.value ? "live" : "limited",
        lastUpdated: now,
        freshness:
          floodZoneResult.status === "fulfilled" && floodZoneResult.value?.source === "glofas"
            ? "7-day ensemble forecast — refreshed every 6 hours"
            : "Cached up to 24 hours",
        coverage:
          floodZoneResult.status === "fulfilled" && floodZoneResult.value?.source === "glofas"
            ? "Global (~10 km resolution, river channels only)"
            : "United States only",
        confidence:
          floodZoneResult.status === "fulfilled" && floodZoneResult.value?.source === "glofas"
            ? "GloFAS river-discharge forecast — hydrological context only, not a regulatory flood zone. Meaningful near rivers; may be zero in areas without modelled channels."
            : floodZoneResult.status === "fulfilled" && floodZoneResult.value
              ? "Direct FEMA flood-zone designation at or immediately around the selected point."
              : "FEMA did not return a flood-zone designation for this point.",
      }),
      water: buildRegistryAwareSourceMeta({
        id: "water-gauges",
        label: "Stream gauges",
        provider: "USGS Water Services",
        domain: "hydrology",
        context: registryContext,
        status:
          !isUsPoint
            ? "unavailable"
            : waterGaugeResult.status === "fulfilled" && waterGaugeResult.value.length > 0
              ? "live"
              : "limited",
        lastUpdated: now,
        freshness: "Cached up to 15 minutes for discharge and 30 minutes for gauge metadata",
        coverage: "United States stream gauge network",
        confidence:
          !isUsPoint
            ? "USGS Water Services is currently only used for US gauges."
            : waterGaugeResult.status === "fulfilled" && waterGaugeResult.value.length > 0
              ? "Direct live discharge readings from nearby active USGS stream gauges."
              : "No nearby active USGS discharge gauges were returned within the current search radius.",
      }),
      groundwater: buildRegistryAwareSourceMeta({
        id: "groundwater",
        label: "Groundwater levels",
        provider: "USGS Groundwater Levels",
        domain: "hydrology",
        context: registryContext,
        status:
          !isUsPoint
            ? "unavailable"
            : groundwaterResult.status === "fulfilled" && groundwaterResult.value.wellCount > 0
              ? "live"
              : "limited",
        lastUpdated: now,
        freshness: "Live field measurements within the last 30 days",
        coverage: "United States groundwater monitoring wells",
        confidence:
          !isUsPoint
            ? "USGS groundwater monitoring coverage is currently US-only."
            : groundwaterResult.status === "fulfilled" && groundwaterResult.value.wellCount > 0
              ? "Direct groundwater level readings from nearby USGS monitoring wells."
              : "No nearby active groundwater monitoring well with recent readings was found in the current search box.",
      }),
      soilProfile: buildRegistryAwareSourceMeta({
        id: "soil-profile",
        label: "Soil profile",
        provider: isUsPoint ? "NRCS Soil Data Access (SSURGO)" : "SoilGrids (ISRIC)",
        domain: "terrain",
        context: registryContext,
        status: hasSoilProfile ? "live" : "limited",
        lastUpdated: now,
        freshness: isUsPoint ? "Cached up to 24 hours" : "250m global rasters — cached 7 days",
        coverage: isUsPoint ? "United States mapped soil survey areas" : "Global (250 m resolution)",
        confidence: hasSoilProfile
          ? isUsPoint
            ? "Direct mapped soil-survey attributes for the intersecting map unit."
            : "Texture, drainage, and hydrologic group derived from SoilGrids clay/silt/sand means at 0-30 cm. Depth to water table and K factor are US-only."
          : isUsPoint
            ? "No mapped SSURGO soil profile was returned for this point."
            : "SoilGrids returned no data for this coordinate.",
      }),
      seismicDesign: buildRegistryAwareSourceMeta({
        id: "seismic-design",
        label: "Seismic design parameters",
        provider: "USGS Seismic Design Maps",
        domain: "hazards",
        context: registryContext,
        status: !isUsPoint ? "limited" : hasSeismicDesign ? "live" : "limited",
        lastUpdated: now,
        freshness: "ASCE 7-22 reference values",
        coverage: "United States design-map coverage",
        confidence:
          !isUsPoint
            ? "USGS ASCE 7-22 design-map coverage is US-only. Seismic context for this location is derived from the USGS earthquake catalog (recent seismicity, 30-day window)."
            : hasSeismicDesign
              ? "Direct site-specific seismic design parameters from the USGS design-maps service."
              : "USGS design-map parameters were unavailable for this point.",
      }),
      climateHistory: buildRegistryAwareSourceMeta({
        id: "climate-history",
        label: "Historical climate trends",
        provider: "Open-Meteo Historical Archive",
        domain: "weather",
        context: registryContext,
        status: hasClimateHistory ? "live" : "limited",
        lastUpdated: now,
        freshness: "Archived daily records through the previous calendar year",
        coverage: "Global historical weather archive",
        confidence:
          hasClimateHistory
            ? "Derived yearly trend summaries from archived daily Open-Meteo records."
            : "Historical climate summaries could not be assembled for this point.",
      }),
      solarResource: buildRegistryAwareSourceMeta({
        id: "solar-resource",
        label: "Solar irradiance",
        provider: "NASA POWER",
        domain: "weather",
        context: registryContext,
        status:
          solarResourceResult.status === "fulfilled" &&
          solarResourceResult.value.annualGhiKwhM2Day !== null
            ? "live"
            : "limited",
        lastUpdated: now,
        freshness: "22-year climatological averages (2001–2022), cached 7 days",
        coverage: "Global — NASA satellite-derived surface irradiance",
        confidence:
          solarResourceResult.status === "fulfilled" &&
          solarResourceResult.value.annualGhiKwhM2Day !== null
            ? "NASA POWER provides satellite-derived climatological GHI and clearness index. Values are multi-year averages, not real-time readings."
            : "Solar resource data could not be retrieved for this point.",
      }),
      airQuality: buildRegistryAwareSourceMeta({
        id: "air-quality",
        label: "Air quality stations",
        provider: "OpenAQ",
        domain: "environmental",
        context: registryContext,
        status:
          airQualityResult.status === "fulfilled" && airQualityResult.value
            ? "live"
            : "limited",
        lastUpdated: now,
        freshness: "Cached up to 30 minutes",
        coverage: "Global where OpenAQ stations exist",
        confidence:
          airQualityResult.status === "fulfilled" && airQualityResult.value
            ? "Direct fine-particle readings from the nearest OpenAQ monitoring station."
            : "No nearby OpenAQ PM2.5 or PM10 station reading was available within the supported search radius.",
      }),
      epaHazards: buildRegistryAwareSourceMeta({
        id: "epa-hazards",
        label: "Contamination screening",
        provider: isUsPoint
          ? "EPA Envirofacts"
          : isEuropeanPoint
            ? "EEA E-PRTR"
            : "EPA Envirofacts",
        domain: "environmental",
        context: registryContext,
        status:
          isUsPoint || isEuropeanPoint
            ? epaHazardResult.status === "fulfilled" && epaHazardResult.value !== null
              ? "live"
              : "limited"
            : "unavailable",
        lastUpdated: now,
        freshness: isUsPoint ? "Cached up to 12 hours" : "Cached up to 24 hours",
        coverage: isUsPoint
          ? "United States only"
          : isEuropeanPoint
            ? "EU/EEA member states (E-PRTR industrial facility registry)"
            : "United States only",
        confidence: isUsPoint
          ? epaHazardResult.status === "fulfilled"
            ? "Nearby Superfund and TRI counts are screened from EPA public datasets, then distance-filtered around the selected point."
            : "EPA contamination-screening results could not be assembled for this point."
          : isEuropeanPoint
            ? epaHazardResult.status === "fulfilled" && epaHazardResult.value !== null
              ? "EEA E-PRTR industrial facility registry screened within the active bounding box. Counts reflect registered polluting facilities — not a remediation status indicator."
              : "EEA E-PRTR facility data could not be retrieved for this point."
            : "Contamination screening is currently only available for US (EPA) and European (EEA E-PRTR) locations.",
        note: !isUsPoint && !isEuropeanPoint
          ? "EPA contamination screening is US-only. EEA E-PRTR covers EU/EEA member states. No equivalent dataset is wired for this region yet."
          : undefined,
      }),
      hazardAlerts: buildRegistryAwareSourceMeta({
        id: "hazard-alerts",
        label: "Global disaster alerts",
        provider: "GDACS",
        domain: "hazards",
        context: registryContext,
        status:
          gdacsAlertResult.status === "fulfilled" && gdacsAlertResult.value
            ? "live"
            : "limited",
        lastUpdated: now,
        freshness: "Live feed cached up to 15 minutes",
        coverage: "Global active disaster notifications",
        accessType: "api",
        confidence:
          gdacsAlertResult.status === "fulfilled" && gdacsAlertResult.value
            ? gdacsAlertResult.value.elevatedCurrentAlerts > 0
              ? "GDACS is a global alerting feed for major disaster notifications. It complements local hazard layers but does not model parcel-level impact."
              : "GDACS returned current global alerts, but no Orange or Red escalation is active in the latest feed."
            : "GDACS alert feed could not be retrieved for this point right now.",
        note:
          "GDACS provides broad global disaster notifications for earthquakes, floods, volcanoes, drought, tropical cyclones, and related events.",
      }),
    },
    sourceNotes: [
      "Elevation via USGS EPQS in the US, with OpenTopoData SRTM fallback for global coverage.",
      "Overpass OSM features for roads, power lines, waterways, amenities, and land-use context.",
      "Open-Meteo current weather, forecast, and air-quality snapshots.",
      "USGS earthquake event feed summarized within 250 km over the last 30 days.",
      "USGS groundwater well readings summarized from recent field measurements where nearby monitoring wells are available.",
      fireHazardConfigured
        ? "NASA FIRMS VIIRS fire detections summarized within the active region."
        : "NASA FIRMS fire detections are available when NASA_FIRMS_MAP_KEY is configured.",
      registryContext.scopes.includes("europe")
        ? "FCC + ACS support US county demographics, while Eurostat provides Europe country-level population and median income baselines."
        : "FCC county lookup with ACS 5-year Census demographics, with World Bank national indicators for non-US locations.",
      broadbandData?.kind === "regional_household_baseline"
        ? `Eurostat household fixed/mobile broadband percentages provide a ${broadbandData.regionLabel} country-level connectivity baseline for ${broadbandData.referenceYear ?? "the latest available year"}.`
        : null,
      "NCES nearby public-school baseline with Washington OSPI official accountability when matched; OSM school count provides density context for non-US locations.",
      "NRCS Soil Data Access provides mapped soil drainage, water-table, bedrock, and texture context for US points; SoilGrids (ISRIC) provides global soil texture and drainage at 250 m resolution.",
      "USGS seismic design maps provide ASCE 7-22 ground-shaking parameters for US points; USGS global earthquake catalog provides recent seismicity context globally.",
      "Open-Meteo historical archive powers the 2015-2024 climate trend summaries.",
      "GDACS global disaster notifications provide broad alert context for major current events.",
      isUsPoint
        ? "EPA Envirofacts (CERCLIS Superfund + TRI facilities) provides contamination screening for US points."
        : isEuropeanPoint
          ? "EEA E-PRTR industrial facility registry provides contamination context for EU/EEA member state locations."
          : null,
      !isUsPoint
        ? registryContext.scopes.includes("europe")
          ? "Europe uses Eurostat for broadband baselines, EEA E-PRTR for contamination, and SoilGrids (ISRIC) + GloFAS for soil and flood context. USGS Water Services, groundwater wells, and seismic design maps remain US-only."
          : "Broadband point lookups, USGS Water Services, groundwater wells, and seismic design maps are currently US-only. Soil data is global via SoilGrids (ISRIC); flood context is global via GloFAS (Open-Meteo)."
        : null,
    ].filter((note): note is string => typeof note === "string" && note.trim().length > 0),
  };

  // Cache the assembled result (fire-and-forget)
  setGeodataCache(lat, lng, geodata);

  return NextResponse.json(geodata, {
    headers: {
      "Cache-Control": "s-maxage=21600, stale-while-revalidate=43200",
      ...rateLimitHeaders(rateLimit),
      "X-Cache": "MISS",
    },
  });
}
